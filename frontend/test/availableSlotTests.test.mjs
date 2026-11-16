import { test } from 'node:test'
import assert from 'node:assert/strict'
import { availableSlotTests } from '../src/lib/availableSlotTests.js'

const tests = [{ uid: 'assigned' }, { uid: 'unassigned' }]
const relations = [{ group_slot_uid: 'slot', test_uid: 'assigned' }]

test('active slots use instants across socket and Electric date formats', () => {
   for (const [start, end] of [
      ['2026-11-16 09:00:00+00', '2026-11-16 11:00:00+00'],
      ['2026-11-16T10:00:00+01:00', '2026-11-16T12:00:00+01:00'],
      [new Date('2026-11-16T09:00:00Z'), new Date('2026-11-16T11:00:00Z')],
   ]) {
      const slots = [{ uid: 'slot', start, end }]
      for (const time of ['09:00:00', '10:00:00', '11:00:00']) {
         assert.deepEqual(availableSlotTests(slots, relations, tests, `2026-11-16T${time}Z`), [tests[0]])
      }
      for (const time of ['08:59:59', '11:00:01']) {
         assert.deepEqual(availableSlotTests(slots, relations, tests, `2026-11-16T${time}Z`), [])
      }
   }
})

test('loading, invalid dates and missing assignments do not expose tests', () => {
   assert.deepEqual(availableSlotTests(), [])
   assert.deepEqual(availableSlotTests([{ uid: 'slot', start: null, end: 'invalid' }], relations, tests), [])
   const slots = [{ uid: 'slot', start: '2026-11-16T09:00:00Z', end: '2026-11-16T11:00:00Z' }]
   const now = '2026-11-16T10:00:00Z'
   assert.deepEqual(availableSlotTests(slots, [...relations, ...relations], tests, now), [tests[0]])
   assert.deepEqual(availableSlotTests(slots, relations, [], now), [])
   assert.deepEqual(availableSlotTests(slots, [], tests, now), [])
})
