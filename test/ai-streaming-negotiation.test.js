import assert from 'node:assert';
import {
  createSSEStream,
  runNegotiationAgent,
  TOOL_GET_MY_USER_DATA,
  TOOL_UPDATE_QUEST_PARAMETERS,
  TOOL_SUGGEST_NEGOTIATION_OPTIONS
} from '../api/ai.js';
import handler from '../api/ai.js';
import { verifyQuestSignature, signQuest, setRedisClientForTesting } from '../api/sync.js';

// Mock Redis Client để tránh mở kết nối TCP thật và kiểm thử chạy tức thì
const mockRedis = {
  get: async () => null,
  set: async () => 'OK',
  incr: async () => 1,
  expire: async () => 1
};
setRedisClientForTesting(mockRedis);

console.log('=== KIỂM THỬ TÍCH HỢP SERVER-SENT EVENTS (SSE) STREAMING THỜI GIAN THỰC ===\n');

// -----------------------------------------------------------------------------
// 1. Kiểm thử createSSEStream thiết lập đúng headers và format chuẩn SSE
// -----------------------------------------------------------------------------
{
  const headers = {};
  const chunks = [];
  let isEnded = false;

  const mockRes = {
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    flushHeaders() {},
    write(chunk) { chunks.push(chunk); },
    end() { isEnded = true; }
  };

  const sse = createSSEStream(mockRes);

  assert.strictEqual(headers['content-type'], 'text/event-stream; charset=utf-8');
  assert.strictEqual(headers['cache-control'], 'no-cache, no-transform');
  assert.strictEqual(headers['x-accel-buffering'], 'no');

  sse.send('step', { step: 1, text: 'Đang tra cứu...' });
  assert.strictEqual(chunks.length, 1);
  assert.ok(chunks[0].includes('event: step\n'));
  assert.ok(chunks[0].includes('data: {"step":1,"text":"Đang tra cứu..."}\n\n'));

  sse.end('result', { accepted: true });
  assert.strictEqual(chunks.length, 2);
  assert.ok(chunks[1].includes('event: result\n'));
  assert.ok(chunks[1].includes('data: {"accepted":true}\n\n'));
  assert.strictEqual(isEnded, true);

  console.log('✓ Test 1: createSSEStream thiết lập đúng HTTP headers và định dạng chunk event: / data: chuẩn spec SSE.');
}

// -----------------------------------------------------------------------------
// 2. Kiểm thử runNegotiationAgent bắn sự kiện tiến trình thực tế qua onEvent
// -----------------------------------------------------------------------------
{
  const events = [];
  const quest = {
    title: 'Yoga giãn cơ nhẹ nhàng',
    description: 'Thư giãn cơ thể',
    targetMinutes: 0,
    rewardCoins: 6,
    type: 'bounty'
  };

  const res = await runNegotiationAgent({
    domain: 'quest',
    caller: { sub: 'knight_test_01' },
    redis: null,
    systemPrompt: 'System',
    userPrompt: 'User',
    targetEntity: quest,
    selectedOption: {
      id: 1,
      label: 'Phương án 1 (10 phút • 7 Vàng)',
      newTargetMinutes: 10,
      newRewardCoins: 7,
      newType: 'focus'
    },
    userArgument: 'Chốt phương án 1: 10 phút, 7 Vàng',
    tools: [TOOL_GET_MY_USER_DATA, TOOL_UPDATE_QUEST_PARAMETERS, TOOL_SUGGEST_NEGOTIATION_OPTIONS],
    onEvent: (event, data) => {
      events.push({ event, data });
    }
  });

  assert.ok(events.length >= 2, 'Phải có ít nhất 2 sự kiện tiến trình thời gian thực được phát đi');
  assert.strictEqual(events[0].event, 'step');
  assert.strictEqual(events[0].data.step, 1);
  assert.ok(events[0].data.pct > 0);

  const finalStep = events[events.length - 1];
  assert.strictEqual(finalStep.event, 'step');
  assert.strictEqual(finalStep.data.step, 5);
  assert.strictEqual(finalStep.data.pct, 95);

  assert.strictEqual(res.accepted, true);
  assert.strictEqual(res.newTargetMinutes, 10);
  assert.strictEqual(res.newRewardCoins, 7);

  console.log('✓ Test 2: runNegotiationAgent phát đúng chuỗi sự kiện tiến trình thực tế (Step 1 -> Step 5) qua onEvent.');
}

// -----------------------------------------------------------------------------
// 3. Kiểm thử endpoint handler(req, res) khi client yêu cầu stream: true
// -----------------------------------------------------------------------------
{
  process.env.ADMIN_TOKEN = 'test_admin_token_sse';

  const headers = {};
  const chunks = [];
  let isEnded = false;
  let jsonResponse = null;

  const mockReq = {
    method: 'POST',
    headers: {
      'authorization': 'Bearer test_admin_token_sse',
      'accept': 'text/event-stream'
    },
    body: {
      action: 'debate_quest',
      payload: {
        quest: {
          title: 'Yoga giãn cơ nhẹ nhàng',
          description: 'Thư giãn',
          targetMinutes: 0,
          rewardCoins: 6,
          type: 'bounty'
        },
        argument: 'Mình muốn đếm thời gian 10 phút và nâng lên 7 vàng do tập yoga cũng mệt',
        selectedOption: {
          id: 1,
          label: 'Phương án 1 (10 phút • 7 Vàng)',
          newTargetMinutes: 10,
          newRewardCoins: 7,
          newType: 'focus'
        },
        stream: true
      }
    }
  };

  const mockRes = {
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    flushHeaders() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    write(chunk) { chunks.push(chunk); },
    end() { isEnded = true; },
    json(data) { jsonResponse = data; }
  };

  await handler(mockReq, mockRes);

  assert.strictEqual(headers['content-type'], 'text/event-stream; charset=utf-8');
  assert.strictEqual(jsonResponse, null, 'Không được gọi res.json khi đang ở chế độ stream');
  assert.strictEqual(isEnded, true, 'Stream phải được đóng bằng res.end()');
  assert.ok(chunks.length >= 2, 'Phải có các chunk event: step và event: result');

  // Phân tích kết quả cuối cùng từ chunk stream
  const resultChunk = chunks.find(c => c.includes('event: result'));
  assert.ok(resultChunk, 'Phải có chunk mang sự kiện result');

  const dataMatch = resultChunk.match(/data:\s*(\{.*\})\n\n/);
  assert.ok(dataMatch, 'Dữ liệu result phải là một chuỗi JSON hợp lệ');

  const finalResult = JSON.parse(dataMatch[1]);
  assert.strictEqual(finalResult.accepted, true);
  assert.strictEqual(finalResult.newTargetMinutes, 10);
  assert.strictEqual(finalResult.newRewardCoins, 7);
  assert.ok(finalResult.signature, 'Phải có chữ ký số HMAC');

  const isValidSig = verifyQuestSignature({
    title: finalResult.newTitle,
    type: finalResult.newType,
    targetMinutes: finalResult.newTargetMinutes,
    rewardCoins: finalResult.newRewardCoins,
    requiresProof: finalResult.newRequiresProof,
    signature: finalResult.signature
  });
  assert.strictEqual(isValidSig, true, 'Chữ ký số HMAC gửi qua stream phải hợp lệ 100%');

  console.log('✓ Test 3: Endpoint /api/ai phản hồi trọn vẹn luồng SSE stream khi stream: true kèm chữ ký HMAC hợp lệ.');
}

// -----------------------------------------------------------------------------
// 4. Kiểm thử tương thích ngược (Backward Compatibility) khi không có stream: true
// -----------------------------------------------------------------------------
{
  let jsonResponse = null;
  let writeCalled = false;

  const mockReq = {
    method: 'POST',
    headers: {
      'authorization': 'Bearer test_admin_token_sse'
    },
    body: {
      action: 'debate_quest',
      payload: {
        quest: {
          title: 'Yoga giãn cơ nhẹ nhàng',
          description: 'Thư giãn',
          targetMinutes: 0,
          rewardCoins: 6,
          type: 'bounty'
        },
        argument: 'Mình muốn đếm thời gian 10 phút và nâng lên 7 vàng do tập yoga cũng mệt',
        selectedOption: {
          id: 1,
          label: 'Phương án 1 (10 phút • 7 Vàng)',
          newTargetMinutes: 10,
          newRewardCoins: 7,
          newType: 'focus'
        }
        // Không có stream: true
      }
    }
  };

  const mockRes = {
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    write() { writeCalled = true; },
    end() {},
    json(data) { jsonResponse = data; }
  };

  await handler(mockReq, mockRes);

  assert.strictEqual(writeCalled, false, 'Không được gọi res.write khi không yêu cầu stream');
  assert.ok(jsonResponse, 'Phải trả về JSON tĩnh qua res.json');
  assert.strictEqual(jsonResponse.accepted, true);
  assert.strictEqual(jsonResponse.newTargetMinutes, 10);
  assert.strictEqual(jsonResponse.newRewardCoins, 7);

  console.log('✓ Test 4: Tương thích ngược 100%: Khi không truyền stream: true, server vẫn trả JSON tĩnh như cũ.');
}

console.log('\n======================================================================');
console.log('🎉 TẤT CẢ 4 NHÓM KIỂM THỬ SSE STREAMING THỜI GIAN THỰC ĐÃ HOÀN TẤT!');
console.log('======================================================================\n');
process.exit(0);
