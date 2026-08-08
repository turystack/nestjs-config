import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { loadEnvFile } from '@/config.env.js'

const directory = mkdtempSync(path.join(tmpdir(), 'nestjs-config-'))

const write = (name: string, content: string): string => {
	const filePath = path.join(directory, name)
	writeFileSync(filePath, content)
	return filePath
}

afterAll(() => {
	rmSync(directory, {
		force: true,
		recursive: true,
	})
})

describe('loadEnvFile', () => {
	it('parses KEY=VALUE lines', () => {
		const file = write(
			'basic.env',
			'DATABASE_URL=postgres://localhost\nPORT=3000\n',
		)

		expect(loadEnvFile(file)).toEqual({
			DATABASE_URL: 'postgres://localhost',
			PORT: '3000',
		})
	})

	it('ignores comments, blank lines and lines without separator', () => {
		const file = write(
			'comments.env',
			'# comment\n\nVALID=yes\nnot-a-pair\n  # indented comment\n',
		)

		expect(loadEnvFile(file)).toEqual({
			VALID: 'yes',
		})
	})

	it('strips matching single and double quotes', () => {
		const file = write(
			'quotes.env',
			'DOUBLE="hello world"\nSINGLE=\'quoted\'\nMIXED="unbalanced\'\n',
		)

		expect(loadEnvFile(file)).toEqual({
			DOUBLE: 'hello world',
			MIXED: '"unbalanced\'',
			SINGLE: 'quoted',
		})
	})

	it('keeps = characters inside the value', () => {
		const file = write('equals.env', 'TOKEN=abc=def==\n')

		expect(loadEnvFile(file)).toEqual({
			TOKEN: 'abc=def==',
		})
	})

	it('ignores lines with an empty key', () => {
		const file = write('empty-key.env', '=value\nOK=1\n')

		expect(loadEnvFile(file)).toEqual({
			OK: '1',
		})
	})

	it('returns an empty object when the file does not exist', () => {
		expect(loadEnvFile(path.join(directory, 'missing.env'))).toEqual({})
	})
})
