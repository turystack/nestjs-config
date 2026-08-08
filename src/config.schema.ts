import type { ZodType, z } from 'zod'

/** Shape of a config schema: one zod validator per environment variable. */
export type ConfigSchemaShape = Record<string, ZodType>

/**
 * Identity helper that preserves the exact schema type for registry
 * augmentation (`declare module '@turystack/nestjs-config'`).
 */
export function defineConfigSchema<T extends ConfigSchemaShape>(schema: T): T {
	return schema
}

/** Empty interface — consumer augments via `declare module '@turystack/nestjs-config'`. */
export interface ConfigSchemaRegistry {}

type RegisteredSchema = ConfigSchemaRegistry extends {
	schema: infer T
}
	? T
	: never

/**
 * Map of config keys to their parsed value types, derived from the registered
 * schema. Falls back to `Record<string, unknown>` when no schema is registered.
 */
export type ConfigValues = keyof ConfigSchemaRegistry extends never
	? Record<string, unknown>
	: {
			[K in keyof RegisteredSchema &
				string]: RegisteredSchema[K] extends ZodType
				? z.output<RegisteredSchema[K]>
				: never
		}
