import { type DynamicModule, Module } from '@nestjs/common'
import { z } from 'zod'

import { loadEnvFile } from '@/config.env.js'
import { ConfigService } from '@/config.service.js'
import type { ConfigModuleOptions } from '@/config.types.js'

@Module({})
export class ConfigModule {
	/**
	 * Registers the typed configuration globally. Register it once in the root
	 * module: the environment (`.env` file merged under `process.env`) is parsed
	 * against the schema at boot and the application fails fast with every
	 * missing/invalid variable listed at once.
	 */
	static register(options: ConfigModuleOptions): DynamicModule {
		return {
			exports: [
				ConfigService,
			],
			global: true,
			module: ConfigModule,
			providers: [
				{
					provide: ConfigService,
					useFactory: () => new ConfigService(ConfigModule._validate(options)),
				},
			],
		}
	}

	private static _resolveEnvironment(
		options: ConfigModuleOptions,
	): Record<string, string | undefined> {
		if (options.envFilePath === false) {
			return {
				...process.env,
			}
		}

		return {
			...loadEnvFile(options.envFilePath ?? '.env'),
			...process.env,
		}
	}

	private static _validate(
		options: ConfigModuleOptions,
	): Record<string, unknown> {
		const result = z
			.object(options.schema)
			.safeParse(ConfigModule._resolveEnvironment(options))

		if (result.success) {
			return result.data
		}

		const details = result.error.issues
			.map((issue) => `${String(issue.path[0] ?? '')}: ${issue.message}`)
			.join(' · ')

		throw new Error(
			`[ConfigModule] Invalid environment configuration — ${details}`,
		)
	}
}
