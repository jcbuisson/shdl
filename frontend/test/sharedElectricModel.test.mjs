import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Subject } from 'rxjs'
import { useSharedElectricModel } from '../src/use/useSharedElectricModel.ts'

test('confirmed creates/deletes are visible before Electric catches up', async () => {
   const electric = new Subject()
   let fail = false
   const app = {
      createElectricModel: () => ({
         getObservable: () => electric,
         create: async (uid, data) => {
            if (fail) throw new Error('rejected')
            return { uid, ...data }
         },
         remove: async uid => {
            if (fail) throw new Error('rejected')
            return { uid }
         },
      }),
   }
   const model = useSharedElectricModel(app, 'user_document')
   let rows
   const subscription = model.getObservable({ user_uid: 'owner' }).subscribe(value => { rows = value })
   const existing = { uid: 'existing', user_uid: 'owner', name: 'old' }
   electric.next([existing])
   const created = await model.create({ user_uid: 'owner', name: 'new' })
   assert.deepEqual(rows, [existing, created])
   electric.next([existing]) // stale snapshot must not hide the confirmed create
   assert.deepEqual(rows, [existing, created])
   electric.next([existing, created])
   assert.equal(rows.length, 2) // no duplicate on confirmation

   await model.remove(existing.uid)
   assert.deepEqual(rows, [created])
   electric.next([existing, created]) // stale snapshot must not resurrect the deleted row
   assert.deepEqual(rows, [created])
   electric.next([created])

   // Once confirmed, remote edits and deletes remain authoritative.
   electric.next([{ ...created, name: 'remote edit' }])
   assert.equal(rows[0].name, 'remote edit')
   electric.next([])
   assert.deepEqual(rows, [])

   fail = true
   await assert.rejects(model.create({ user_uid: 'owner', name: 'failed' }))
   assert.deepEqual(rows, [])
   electric.next([created])
   await assert.rejects(model.remove(created.uid))
   assert.deepEqual(rows, [created])
   subscription.unsubscribe()
})
