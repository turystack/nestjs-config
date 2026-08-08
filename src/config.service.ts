import type { ConfigValues } from '@/config.schema.js'

/**
 * Typed access to the validated environment. Values were parsed against the
 * schema at boot — `get` always returns the exact type the schema declares
 * (optionals are `| null` by schema design), so there is no `getOrThrow`.
 */
export class ConfigService {
	private readonly _values: Record<string, unknown>

	constructor(values: Record<string, unknown>) {
		this._values = values
	}

	get<K extends keyof ConfigValues & string>(key: K): ConfigValues[K] {
		return this._values[key] as ConfigValues[K]
	}
}
