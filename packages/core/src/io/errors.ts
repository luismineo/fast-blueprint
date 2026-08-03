export type IoErrorCode =
  | 'INVALID_JSON'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'UNKNOWN_SCHEMA_VERSION'
  | 'ORPHAN_NODE_REF';

export type IoWarningCode =
  | 'FLOAT_COORD_ROUNDED'
  | 'DUPLICATE_NODE_REMOVED'
  | 'ORPHAN_NODE_REMOVED'
  | 'MISSING_ARRAY_DEFAULTED';

export interface IoError {
  code: IoErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface IoWarning {
  code: IoWarningCode;
  message: string;
  details?: Record<string, unknown>;
}
