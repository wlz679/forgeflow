/**
 * Storage envelope migration helper.
 *
 * The localStorage envelope format is `{ schemaVersion: 1, data: T }`.
 * On schemaVersion mismatch, we currently reset to fallback + warn.
 * Future v1→v2 migration code can be added here (the envelope pattern
 * is in place so we never lose user data on upgrade).
 */

const CURRENT_VERSION = 1;

export interface StorageEnvelope<T> {
  schemaVersion: number;
  data: T;
}

export function migrateEnvelope<T>(parsed: unknown, fallback: T): T {
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('schemaVersion' in parsed)
  ) {
    console.warn('[enterprise/migration] no schemaVersion found, resetting');
    return fallback;
  }
  const env = parsed as StorageEnvelope<T>;
  if (env.schemaVersion !== CURRENT_VERSION) {
    console.warn(
      `[enterprise/migration] schemaVersion ${env.schemaVersion} != ${CURRENT_VERSION}, resetting`
    );
    return fallback;
  }
  return env.data;
}
