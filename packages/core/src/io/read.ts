import { planDocumentSchema } from '../model/schemas';
import { validateDocumentErrors } from '../model/validation';
import type { PlanDocument } from '../model/types';
import type { IoError, IoWarning } from './errors';
import { migrateDocument } from './migrate';
import { repairDocument } from './repair';

export type ReadResult =
  | { ok: true; doc: PlanDocument; warnings: IoWarning[] }
  | { ok: false; error: IoError };

export function readDocument(json: string): ReadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: { code: 'INVALID_JSON', message: 'Failed to parse JSON' } };
  }

  const migrationResult = migrateDocument(raw);
  if ('error' in migrationResult) {
    return { ok: false, error: migrationResult.error };
  }

  const repairResult = repairDocument(migrationResult.doc);
  const warnings = [...repairResult.warnings];
  const repairedRaw = repairResult.repaired;

  const parseResult = planDocumentSchema.safeParse(repairedRaw);
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        code: 'SCHEMA_VALIDATION_FAILED',
        message: 'Schema validation failed',
        details: { issues: parseResult.error.issues },
      },
    };
  }

  const doc = parseResult.data as unknown as PlanDocument;

  const rawObj = migrationResult.doc as Record<string, unknown>;
  if (!Array.isArray(rawObj.walls) || !Array.isArray(rawObj.openings)) {
    warnings.push({
      code: 'MISSING_ARRAY_DEFAULTED',
      message: 'Missing arrays were defaulted to empty',
    });
  }

  const errors = validateDocumentErrors(doc);
  if (errors.length > 0) {
    const e2Error = errors.find(e => e.code === 'E2' && e.message.includes('Room '));
    if (e2Error) {
      const roomId = e2Error.ids[0];
      const room = doc.rooms.find(r => r.id === roomId);
      return {
        ok: false,
        error: {
          code: 'ORPHAN_NODE_REF',
          message: 'Room references non-existent node',
          details: { roomName: room?.name },
        },
      };
    }

    return {
      ok: false,
      error: {
        code: 'SCHEMA_VALIDATION_FAILED',
        message: 'Invariant validation failed',
        details: { errors },
      },
    };
  }

  return { ok: true, doc, warnings };
}
