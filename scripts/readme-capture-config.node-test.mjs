import assert from 'node:assert/strict'
import test from 'node:test'
import {
  captures,
  resolveBaseUrl,
} from './readme-capture-config.mjs'

test('defines the three committed README assets', () => {
  assert.deepEqual(
    captures.map(({ name, width, height }) => ({
      name,
      width,
      height,
    })),
    [
      { name: 'landing-hero', width: 1440, height: 900 },
      { name: 'food-lifecycle', width: 1440, height: 900 },
      { name: 'mobile-demo', width: 412, height: 915 },
    ],
  )
})

test('defaults to the documented local preview origin', () => {
  assert.equal(
    resolveBaseUrl(undefined),
    'http://127.0.0.1:4173',
  )
})

test('uses filesystem-safe names and absolute routes', () => {
  for (const capture of captures) {
    assert.match(capture.name, /^[a-z0-9-]+$/)
    assert.ok(capture.route.startsWith('/'))
  }
})
