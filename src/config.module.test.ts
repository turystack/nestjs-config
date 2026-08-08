import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { Injectable, Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ConfigModule } from '@/config.module.js'
import { defineConfigSchema } from '@/config.schema.js'
import { ConfigService } from '@/config.service.js'

const directory = mkdtempSync(path.join(tmpdir(), 'nestjs-config-module-'))

afterAll(() => {
	rmSync(directory, {
		force: true,
		recursive: true,
	})
})

afterEach(() => {
	vi.unstubAllEnvs()
})

const bootstrap = async (
	options: Parameters<typeof ConfigModule.register>[0],
) => {
	const moduleRef = await Test.createTestingModule({
		imports: [
			ConfigModule.register(options),
		],
	}).compile()

	await moduleRef.init()
	return moduleRef
}

describe('ConfigModule', () => {
	it('parses process.env against the schema with coercion and defaults', async () => {
		vi.stubEnv('DATABASE_URL', 'postgres://localhost/app')
		vi.stubEnv('PORT', '8080')

		const moduleRef = await bootstrap({
			envFilePath: false,
			schema: defineConfigSchema({
				DATABASE_URL: z.string(),
				PORT: z.coerce.number(),
				RETRIES: z.coerce.number().default(3),
				SENTRY_DSN: z.string().nullable().default(null),
			}),
		})

		const config = moduleRef.get(ConfigService)
		expect(config.get('DATABASE_URL')).toBe('postgres://localhost/app')
		expect(config.get('PORT')).toBe(8080)
		expect(config.get('RETRIES')).toBe(3)
		expect(config.get('SENTRY_DSN')).toBeNull()
	})

	it('fails fast listing every missing and invalid variable at once', async () => {
		vi.stubEnv('PORT', 'not-a-number')

		await expect(
			bootstrap({
				envFilePath: false,
				schema: {
					API_KEY: z.string(),
					PORT: z.coerce.number(),
				},
			}),
		).rejects.toThrow(
			/\[ConfigModule\] Invalid environment configuration — (?=.*API_KEY)(?=.*PORT)/,
		)
	})

	it('strips environment variables outside the schema', async () => {
		vi.stubEnv('KNOWN', 'yes')
		vi.stubEnv('UNKNOWN', 'ignored')

		const moduleRef = await bootstrap({
			envFilePath: false,
			schema: {
				KNOWN: z.string(),
			},
		})

		expect(moduleRef.get(ConfigService).get('UNKNOWN')).toBeUndefined()
	})

	it('merges the env file under process.env (process.env wins)', async () => {
		const file = path.join(directory, 'precedence.env')
		writeFileSync(file, 'FROM_FILE=file\nOVERRIDDEN=file\n')
		vi.stubEnv('OVERRIDDEN', 'process')

		const moduleRef = await bootstrap({
			envFilePath: file,
			schema: {
				FROM_FILE: z.string(),
				OVERRIDDEN: z.string(),
			},
		})

		const config = moduleRef.get(ConfigService)
		expect(config.get('FROM_FILE')).toBe('file')
		expect(config.get('OVERRIDDEN')).toBe('process')
	})

	it('skips the env file when envFilePath is false', async () => {
		await expect(
			bootstrap({
				envFilePath: false,
				schema: {
					ANYTHING: z.string(),
				},
			}),
		).rejects.toThrow('[ConfigModule] Invalid environment configuration')
	})

	it('reads .env from the working directory by default', async () => {
		const previous = process.cwd()
		writeFileSync(path.join(directory, '.env'), 'DEFAULT_FILE=yes\n')
		process.chdir(directory)

		try {
			const moduleRef = await bootstrap({
				schema: {
					DEFAULT_FILE: z.string(),
				},
			})

			expect(moduleRef.get(ConfigService).get('DEFAULT_FILE')).toBe('yes')
		} finally {
			process.chdir(previous)
		}
	})

	it('is global: submodule providers inject ConfigService without imports', async () => {
		vi.stubEnv('APP_NAME', 'turystack')

		@Injectable()
		class FeatureService {
			constructor(readonly config: ConfigService) {}
		}

		@Module({
			providers: [
				FeatureService,
			],
		})
		class FeatureModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule.register({
					envFilePath: false,
					schema: {
						APP_NAME: z.string(),
					},
				}),
				FeatureModule,
			],
		}).compile()

		await moduleRef.init()

		const feature = moduleRef.get(FeatureService)
		expect(feature.config.get('APP_NAME')).toBe('turystack')
	})
})
