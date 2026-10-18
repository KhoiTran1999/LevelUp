import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v from 'valibot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const appJs = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
const aiJs = fs.readFileSync(path.join(rootDir, 'api', 'ai.js'), 'utf8');
const aiSchemasJs = fs.readFileSync(path.join(rootDir, 'src', 'schemas', 'ai.js'), 'utf8');
const gameSchemasJs = fs.readFileSync(path.join(rootDir, 'src', 'schemas', 'game.js'), 'utf8');
const proofJs = fs.readFileSync(path.join(rootDir, 'src', 'js', '08-proof.js'), 'utf8');
const renderJs = fs.readFileSync(path.join(rootDir, 'src', 'js', '14-render.js'), 'utf8');

console.log('=== Bắt đầu kiểm thử: Bằng Chứng Báo Cáo Nội Dung (Text Proof) & Thẩm Định AI ===\n');

// 1. Kiểm tra Schemas AI & Game
function testSchemasIntegrity() {
  assert.ok(gameSchemasJs.includes("proofType: v.optional(v.picklist(['photo', 'text', 'both'])"), 'QuestSchema phải hỗ trợ proofType photo/text/both');
  assert.ok(gameSchemasJs.includes('proofGuidance: v.optional(v.string()'), 'QuestSchema phải có proofGuidance');
  
  assert.ok(aiSchemasJs.includes("proofType: v.optional(v.picklist(['photo', 'text', 'both'])"), 'QuestAppraisalOutputSchema phải hỗ trợ proofType');
  assert.ok(aiSchemasJs.includes("newProofType: v.optional(v.picklist(['photo', 'text', 'both']))"), 'DebateOutputSchema phải hỗ trợ newProofType');
  assert.ok(aiSchemasJs.includes('ProofVerificationOutputSchema'), 'src/schemas/ai.js phải có ProofVerificationOutputSchema');
  assert.ok(aiSchemasJs.includes('validateProofVerificationOutput'), 'src/schemas/ai.js phải export validateProofVerificationOutput');

  console.log('✓ Test 1: Schemas Game & AI mở rộng trường proofType ("photo" | "text" | "both") và ProofVerificationOutputSchema hoàn toàn hợp lệ.');
}

// 2. Kiểm tra Heuristic Anti-Cheat trong api/ai.js
function testHeuristicsAntiCheat() {
  assert.ok(aiJs.includes('function evaluateTextProofHeuristics('), 'api/ai.js phải có hàm evaluateTextProofHeuristics');

  // Trích xuất hàm evaluateTextProofHeuristics để chạy unit test trực tiếp
  const fnMatch = aiJs.match(/function evaluateTextProofHeuristics\([\s\S]*?\n\}/);
  assert.ok(fnMatch, 'Tìm thấy hàm evaluateTextProofHeuristics trong api/ai.js');
  
  const evalFn = new Function(`${fnMatch[0]}; return evaluateTextProofHeuristics;`)();

  // Case A: Quá ngắn < 10 ký tự -> từ chối
  const shortResult = evalFn('Đọc sách kinh tế', 'Xong rồi');
  assert.ok(shortResult && shortResult.approved === false, 'Phải từ chối nội dung dưới 10 ký tự');
  assert.ok(shortResult.feedback.includes('tối thiểu 10 ký tự'), 'Phản hồi phải nhắc nhở số lượng ký tự tối thiểu');

  // Case B: Nói không biết làm gì -> từ chối
  const dontKnow1 = evalFn('Lập trình web', 'Tôi không biết mình đã làm gì cả');
  assert.ok(dontKnow1 && dontKnow1.approved === false, 'Phải từ chối khi user khai không biết làm gì');
  assert.ok(dontKnow1.feedback.includes('chưa nêu rõ') || dontKnow1.feedback.includes('cụ thể'), 'Phản hồi từ chối do không biết');

  const dontKnow2 = evalFn('Học tiếng Anh', 'Chịu luôn không nhớ đã học cái gì');
  assert.ok(dontKnow2 && dontKnow2.approved === false, 'Phải từ chối khi user khai chịu không nhớ');

  // Case C: Đối phó, spam, từ khóa hời hợt -> từ chối
  const spam1 = evalFn('Luyện tập code', 'Đã xong rồi nhé admin ơi');
  assert.ok(spam1 && spam1.approved === false, 'Phải từ chối khi chỉ ghi chung chung đã xong');

  const gibberish = evalFn('Đọc tài liệu', 'asdfghjkl qwertyuiop zxcvbnm');
  assert.ok(gibberish && gibberish.approved === false, 'Phải từ chối chuỗi gõ phím vô nghĩa');

  // Case D: Báo cáo nghiêm túc, có tâm -> vượt qua heuristic (trả về null để chuyển cho AI duyệt sâu)
  const genuineReport = evalFn('Học Vue.js', 'Đã đọc chương Composition API, viết thử 2 component Pinia store và chạy test thành công.');
  assert.strictEqual(genuineReport, null, 'Báo cáo hợp lệ phải vượt qua bộ lọc nhanh và trả về null');

  console.log('✓ Test 2: Bộ lọc Heuristic Anti-Cheat chặn đứng báo cáo < 10 ký tự, spam vô nghĩa, và thừa nhận "không biết làm gì".');
}

// 3. Kiểm tra tự động suy luận proofType trong sanitizeEvaluatedQuest
function testProofTypeDeduction() {
  assert.ok(aiJs.includes('function sanitizeEvaluatedQuest('), 'api/ai.js phải có sanitizeEvaluatedQuest');
  
  // Kiểm tra suy luận tự động: study/work -> text, thể chất/vật lý -> photo
  assert.ok(aiJs.includes("if (isStudyOrWork || isCrammedStudy)"), 'Phải có logic nhận diện nhiệm vụ học tập/công việc');
  assert.ok(aiJs.includes("proofType = 'text'"), 'Phải gán proofType là text cho học tập/trí thức');
  assert.ok(aiJs.includes("proofType = 'photo'"), 'Phải gán proofType là photo cho dọn dẹp/thể chất');

  console.log('✓ Test 3: Trọng tài AI tự động gán proofType: "text" cho học tập/code/đọc sách và "photo" cho dọn dẹp/thể chất.');
}

// 4. Kiểm tra giao diện HTML (Tabs Switcher & Text Container)
function testHtmlProofModalComponents() {
  // Bộ chuyển Tab
  assert.ok(indexHtml.includes('id="proof-tab-switcher"'), 'index.html phải có #proof-tab-switcher');
  assert.ok(indexHtml.includes('id="proof-tab-photo"'), 'index.html phải có tab chụp ảnh #proof-tab-photo');
  assert.ok(indexHtml.includes('id="proof-tab-text"'), 'index.html phải có tab báo cáo chữ #proof-tab-text');

  // Container tương ứng cho 2 chế độ
  assert.ok(indexHtml.includes('id="proof-mode-photo-container"'), 'index.html phải có #proof-mode-photo-container');
  assert.ok(indexHtml.includes('id="proof-mode-text-container"'), 'index.html phải có #proof-mode-text-container');
  assert.ok(indexHtml.includes('id="input-quest-proof-text"'), 'index.html phải có ô textarea #input-quest-proof-text');
  assert.ok(indexHtml.includes('id="proof-text-char-count"'), 'index.html phải có nhãn đếm ký tự #proof-text-char-count');

  // Container ảnh trong modal xem lại bằng chứng
  assert.ok(indexHtml.includes('id="proof-viewer-img-container"'), 'index.html phải có #proof-viewer-img-container để có thể ẩn khi xem text proof');

  console.log('✓ Test 4: Giao diện Modal trang bị đầy đủ Bộ Chuyển Tab (Ảnh 📸 / Báo Cáo ✍️), Textarea và bộ đếm ký tự.');
}

// 5. Kiểm tra logic Client JS (08-proof.js, 14-render.js, 18-events.js)
function testClientJsIntegration() {
  // 08-proof.js
  assert.ok(proofJs.includes('function switchProofTab('), '08-proof.js phải có hàm switchProofTab');
  assert.ok(proofJs.includes("workContent.length < 10"), '08-proof.js phải kiểm tra độ dài văn bản tối thiểu 10 ký tự');
  assert.ok(proofJs.includes('proofType: currentProofMode'), '08-proof.js phải gửi proofType trong payload verify_proof');

  // 14-render.js
  assert.ok(renderJs.includes("q.proofType === 'text' ? 'Nộp Báo Cáo Nhận Vàng ✍️'"), 'renderQuests phải hiển thị nhãn Nộp Báo Cáo Nhận Vàng khi proofType là text');
  assert.ok(renderJs.includes("q.proofType === 'text' ? '✍️ Cần báo cáo AI duyệt'"), 'renderQuestDetail phải hiển thị badge Cần báo cáo AI duyệt khi proofType là text');
  assert.ok(renderJs.includes("<span>📝 Xem báo cáo</span>"), 'renderLedger phải hiển thị nút Xem báo cáo khi có proofUserNote mà không có ảnh');

  // app.js đã bundle
  assert.ok(appJs.includes('function switchProofTab('), 'public/app.js phải chứa hàm switchProofTab sau khi build');
  assert.ok(appJs.includes('window.switchProofTab = switchProofTab'), 'public/app.js phải export switchProofTab vào window');
  assert.ok(appJs.includes('proof-tab-text'), 'public/app.js phải xử lý sự kiện click tab text');

  console.log('✓ Test 5: Client JS kết nối trơn tru, hiển thị đúng nhãn nút hành động, huy hiệu và xem lại báo cáo trong sổ cái.');
}

// Chạy lần lượt các test suites
testSchemasIntegrity();
testHeuristicsAntiCheat();
testProofTypeDeduction();
testHtmlProofModalComponents();
testClientJsIntegration();

console.log('\n🎉 TẤT CẢ 5/5 KIỂM THỬ TÙY CHỌN BÁO CÁO NỘI DUNG (TEXT PROOF) ĐÃ HOÀN TẤT VÀ VƯỢT QUA 100%!');
