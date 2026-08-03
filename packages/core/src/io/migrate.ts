import { CURRENT_SCHEMA_VERSION } from '../model/document';
import type { IoError } from './errors';

type Migration = (doc: unknown) => unknown;

const migrations: Record<number, Migration> = {
  1: (doc) => doc,
};

export function migrateDocument(raw: unknown): { doc: unknown; fromVersion: number } | { error: IoError } {
  let version = 1;
  if (typeof raw === 'object' && raw !== null && 'schemaVersion' in raw) {
    version = Number(raw.schemaVersion);
  }

  if (version > CURRENT_SCHEMA_VERSION) {
    return {
      error: {
        code: 'UNKNOWN_SCHEMA_VERSION',
        message: 'Schema version is not supported',
        details: { version, current: CURRENT_SCHEMA_VERSION },
      },
    };
  }

  let doc = raw;
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations[v];
    if (migrate) {
      doc = migrate(doc);
      if (typeof doc === 'object' && doc !== null) {
        Object.assign(doc, { schemaVersion: v + 1 });
      }
    }
  }

  return { doc, fromVersion: version };
}
