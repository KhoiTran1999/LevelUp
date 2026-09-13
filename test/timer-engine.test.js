import assert from 'node:assert';

// 1. Test Delta-Time Math
function calculateDeltaTime(lastTick, now) {
  return (now - lastTick) / 1000;
}

// 2. Test SVG Circular Progress Offset Math
function calculateRingOffset(circumference, remaining, total) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  return circumference * (1 - ratio);
}

// 3. Test Offline / Background Reload Catch-up
function computeRestoredRemaining(savedRemaining, lastTickTime, now) {
  const elapsed = Math.max(0, (now - lastTickTime) / 1000);
  return Math.max(0, savedRemaining - elapsed);
}

// 4. Test Quick Adjust Math
function adjustRemaining(currentRemaining, currentTotal, deltaSec) {
  const newRemaining = Math.max(0, currentRemaining + deltaSec);
  const newTotal = (deltaSec > 0 && newRemaining > currentTotal) ? newRemaining : currentTotal;
  return { newRemaining, newTotal };
}

async function runTimerSanityTests() {
  // Test 1: Background tab throttle simulation (5s real elapsed, single tick)
  const lastTick = 1000000;
  const throttledNow = 1005000; // 5000ms later
  const delta = calculateDeltaTime(lastTick, throttledNow);
  assert.strictEqual(delta, 5, 'Delta time should accurately capture 5 seconds elapsed');

  // Test 2: Circular Progress Ring Calculations
  const r20Circumference = 2 * Math.PI * 20; // ≈ 125.6637
  assert.ok(Math.abs(r20Circumference - 125.66) < 0.1, 'Circumference for r=20 is ~125.66');

  // At 100% remaining: offset = 0
  assert.strictEqual(calculateRingOffset(125.66, 1500, 1500), 0);
  // At 50% remaining: offset = circumference * 0.5
  assert.strictEqual(calculateRingOffset(125.66, 750, 1500), 125.66 * 0.5);
  // At 0% remaining: offset = circumference
  assert.strictEqual(calculateRingOffset(125.66, 0, 1500), 125.66);

  // Test 3: Reload State Recovery with Catch-Up
  const savedRemaining = 1200; // 20 minutes
  const savedTickTime = 1700000000000;
  const reloadNow = savedTickTime + 180000; // tab refreshed 3 minutes later
  const restored = computeRestoredRemaining(savedRemaining, savedTickTime, reloadNow);
  assert.strictEqual(restored, 1020, 'Should accurately deduct 180s from remaining');

  // Reload after timer has expired
  const expiredNow = savedTickTime + 1500000; // 25 minutes later
  const expiredRestored = computeRestoredRemaining(savedRemaining, savedTickTime, expiredNow);
  assert.strictEqual(expiredRestored, 0, 'Should clamp to 0 and trigger completion');

  // Test 4: Quick Adjust
  const adj1 = adjustRemaining(300, 1500, -300);
  assert.strictEqual(adj1.newRemaining, 0);

  const adj2 = adjustRemaining(1500, 1500, 300);
  assert.strictEqual(adj2.newRemaining, 1800);
  assert.strictEqual(adj2.newTotal, 1800, 'Total should expand when remaining exceeds previous total');

  // Test 5: Clock Skew / Time Travel backwards (delta < 0 guard)
  const backwardNow = savedTickTime - 60000; // clock moved back 1 minute
  const skewRestored = computeRestoredRemaining(savedRemaining, savedTickTime, backwardNow);
  assert.strictEqual(skewRestored, savedRemaining, 'Remaining time should not increase if clock jumped backwards');

  // Test 6: Anti-Cheat Wall-clock Verification
  const verifyRewardEligibility = (targetMins, actualSecs) => actualSecs >= (targetMins * 60 - 5);
  assert.strictEqual(verifyRewardEligibility(25, 120), false, 'Cheating early after only 2 minutes must be rejected');
  assert.strictEqual(verifyRewardEligibility(25, 1490), false, 'Under target time must be rejected');
  assert.strictEqual(verifyRewardEligibility(25, 1495), true, 'Full actual focus session within 5s tolerance must be accepted');
  assert.strictEqual(verifyRewardEligibility(25, 1600), true, 'Extended focus session must be accepted');

  console.log('✓ All Timer Engine unit assertions passed successfully.');
}

runTimerSanityTests();
