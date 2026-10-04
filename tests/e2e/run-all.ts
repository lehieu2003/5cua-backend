/**
 * Runner tổng hợp cho toàn bộ E2E suite.
 * Chạy lần lượt từng suite, KHÔNG dừng khi suite trước fail,
 * và exit non-zero nếu BẤT KỲ suite nào fail — dùng cho CI.
 */
import { spawnSync } from 'child_process';

const SUITES = [
  'tests/e2e/e2e_auth.ts',
  'tests/e2e/e2e_security_guards.ts',
  'tests/e2e/e2e_batch_flow.ts',
  'tests/e2e/e2e_operations.ts',
  'tests/e2e/e2e_exports.ts',
  'tests/e2e/e2e_farm_scope.ts',
  'tests/e2e/e2e_password_reset.ts',
  'tests/e2e/e2e_mobile_sync.ts',
];

const failed: string[] = [];

for (const suite of SUITES) {
  console.log(`\n▶▶▶ Running ${suite} ...\n`);
  const res = spawnSync('npx', ['tsx', suite], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'test' },
  });
  if (res.status !== 0) {
    failed.push(suite);
    console.error(`✗✗✗ ${suite} FAILED (exit ${res.status})\n`);
  }
}

console.log('\n===================================================');
console.log('E2E MASTER SUMMARY');
console.log('===================================================');
if (failed.length > 0) {
  console.error(`FAILED SUITES (${failed.length}/${SUITES.length}):`);
  for (const f of failed) console.error(`  - ${f}`);
  process.exit(1);
} else {
  console.log(`ALL ${SUITES.length} SUITES PASSED ✅`);
}
