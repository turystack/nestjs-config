import { describe, expect, it } from 'vitest'

import { ConfigService } from '@/config.service.js'

describe('ConfigService', () => {
	it('returns the parsed value for a key', () => {
		const service = new ConfigService({
			PORT: 3000,
			SENTRY_DSN: null,
		})

		expect(service.get('PORT')).toBe(3000)
		expect(service.get('SENTRY_DSN')).toBeNull()
	})

	it('returns undefined for keys outside the parsed values', () => {
		const service = new ConfigService({})

		expect(service.get('MISSING')).toBeUndefined()
	})
})
