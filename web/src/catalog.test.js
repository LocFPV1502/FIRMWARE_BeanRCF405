import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fallbackCatalog,
  formatBytes,
  isFirmwarePath,
  parseFirmwarePath,
} from './catalog.js'

test('parses ArduPilot APJ and DFU hex', () => {
  const apj = parseFirmwarePath('ardupilot_4.6.3/arducopter-bl.apj', 877028)
  assert.equal(apj.stack, 'ardupilot')
  assert.equal(apj.version, '4.6.3')
  assert.equal(apj.role, 'gcs_update')
  assert.equal(apj.format, 'apj')

  const hex = parseFirmwarePath('ardupilot_4.6.3/arducopter-bl.hex', 2787536)
  assert.equal(hex.stack, 'ardupilot')
  assert.equal(hex.role, 'first_flash')
  assert.equal(hex.format, 'hex')
})

test('parses Betaflight and INAV root hex files', () => {
  const bf = parseFirmwarePath('betaflight_2026.6.0-alpha_STM32F405_BEANRCF405.hex')
  assert.equal(bf.stack, 'betaflight')
  assert.equal(bf.version, '2026.6.0-alpha')

  const inav = parseFirmwarePath('inav_9.1.0_BEANRCF405.hex')
  assert.equal(inav.stack, 'inav')
  assert.equal(inav.version, '9.1.0')
})

test('skips non-firmware paths', () => {
  assert.equal(isFirmwarePath('LICENSE'), false)
  assert.equal(isFirmwarePath('web/index.html'), false)
  assert.equal(isFirmwarePath('inav_9.1.0_BEANRCF405.hex'), true)
})

test('fallback catalog has three stacks', () => {
  const stacks = fallbackCatalog()
  assert.deepEqual(
    stacks.map((s) => s.id),
    ['ardupilot', 'betaflight', 'inav'],
  )
  assert.equal(stacks[0].files.length, 6)
})

test('formatBytes', () => {
  assert.equal(formatBytes(877028), '856 KB')
  assert.equal(formatBytes(2787536), '2.7 MB')
})
