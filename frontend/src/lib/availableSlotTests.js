// Compare instants: socket snapshots and Electric can use different date formats.
export function availableSlotTests(slots = [], relations = [], tests = [], now = new Date()) {
   const time = new Date(now).getTime()
   const activeSlots = new Set(slots.filter(slot =>
      slot.start != null && slot.end != null
      && new Date(slot.start).getTime() <= time
      && time <= new Date(slot.end).getTime()
   ).map(slot => slot.uid))
   const testUids = new Set(relations
      .filter(relation => activeSlots.has(relation.group_slot_uid))
      .map(relation => relation.test_uid))
   return tests.filter(test => testUids.has(test.uid))
}
