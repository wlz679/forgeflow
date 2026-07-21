import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { EXPECTED_ENGINE_COUNT } from './engine-count.ts';

// P22b v2: drift detection guard. The static EXPECTED_ENGINE_COUNT is
// locked at the P16 milestone engine count; this test asserts the
// actual registry still matches. If a future batch adds/removes engines
// without updating the constant, this test fails — keeping the hard-
// coded literal honest via structural integrity check.
test(`engine registry contains exactly ${EXPECTED_ENGINE_COUNT} engines (drift detection)`, async () => {
  await import('../src/engines/index.ts');
  const { getAllEngines } = await import('../src/core/engines/registry.ts');
  assert.equal(
    getAllEngines().length,
    EXPECTED_ENGINE_COUNT,
    `Engine registry has ${getAllEngines().length} engines but EXPECTED_ENGINE_COUNT=${EXPECTED_ENGINE_COUNT}. Update tests/engine-count.ts when adding/removing engines.`
  );
});
