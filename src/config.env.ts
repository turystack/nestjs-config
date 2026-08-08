import { existsSync, readFileSync } from 'node:fs'

const _unquote = (value: string): string => {
	const doubleQuoted = value.startsWith('"') && value.endsWith('"')
	const singleQuoted = value.startsWith("'") && value.endsWith("'")

	if (value.length >= 2 && (doubleQuoted || singleQuoted)) {
		return value.slice(1, -1)
	}

	return value
}

/**
 * Minimal `.env` parser: `KEY=VALUE` lines, `#` comments, optional quotes.
 * Returns an empty object when the file does not exist.
 */
export function loadEnvFile(path: string): Record<string, string> {
	if (!existsSync(path)) {
		return {}
	}

	const values: Record<string, string> = {}

	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const trimmed = line.trim()

		if (!trimmed || trimmed.startsWith('#')) {
			continue
		}

		const separator = trimmed.indexOf('=')

		if (separator === -1) {
			continue
		}

		const key = trimmed.slice(0, separator).trim()
		const value = _unquote(trimmed.slice(separator + 1).trim())

		if (key) {
			values[key] = value
		}
	}

	return values
}
