export const VOLATILE_META_FIELDS = ['modifiedAt', 'appVersion'] as const

export type VolatileMetaField = (typeof VOLATILE_META_FIELDS)[number]
