import type { ConfigSchemaShape } from '@/config.schema.js'

export type ConfigModuleOptions = {
	/** One zod validator per environment variable — the single source of truth. */
	schema: ConfigSchemaShape
	/**
	 * Path of the env file merged under `process.env` (`process.env` wins).
	 * Defaults to `.env`; pass `false` to read `process.env` only.
	 */
	envFilePath?: string | false
}
