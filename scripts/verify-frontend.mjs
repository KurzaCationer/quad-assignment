import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve('src/main/webui/dist')
const html = readFileSync(resolve(dist, 'index.html'), 'utf8')
assert.match(html, /(?:src|href)="\/assets\//, 'Assets must resolve from / on route refresh')
const files = readdirSync(resolve(dist, 'assets')).filter(file => file.endsWith('.js'))
assert.ok(files.length, 'Expected compiled JavaScript assets')
const bundle = files.map(file => readFileSync(resolve(dist, 'assets', file), 'utf8')).join('\n')
// TanStack Router includes a bare http://localhost fallback for non-browser use.
// Reject actual localhost targets with a port or an API path.
assert.ok(!/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+|\/api)/.test(bundle),
  'Production bundle must not point its API at localhost')
// React includes an optional Node error-reporting branch guarded by typeof.
// It is safe without process; reject references outside that known guarded branch.
const browserCode = bundle.replace(
  /typeof process==`object`&&typeof process\.emit==`function`\)\{process\.emit\(`uncaughtException`,\w+\);return\}/g,
  '',
)
assert.ok(!/\bprocess\s*(?:\.|\[)/.test(browserCode), 'Browser code must not require Node process')
assert.ok(!/\/api\/api\//.test(bundle), 'API prefix must only occur once')
assert.ok(/\/api\/get_categories/.test(bundle), 'Expected same-origin generated API paths')
console.log('Browser bundle uses root assets and same-origin API paths without Node process.')
