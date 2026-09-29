import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Subject } from 'rxjs'
import { validate } from 'uuid'
import { useSharedElectricModel } from '../src/use/useSharedElectricModel.ts'

test('versioned mutations update immediately and reconcile with Electric', async () => {
   const electric = new Subject()
   let fail = false
   let version = 0
   const requests = []
   const saved = new Map()
   function mutate(action, uid, data, metadata) {
      if (fail) throw new Error('rejected')
      assert(validate(metadata.clientId))
      assert(BigInt(metadata.revision) > BigInt(requests.at(-1)?.metadata.revision ?? 0))
      requests.push({ action, uid, data, metadata })
      const row = { ...saved.get(uid), ...data, uid, version: String(++version), deleted: action === 'delete' }
      saved.set(uid, row)
      return row
   }
   const app = {
      createElectricModel: () => ({ getObservable: () => electric }),
      service: () => ({
         create: async (uid, data, metadata) => mutate('create', uid, data, metadata),
         update: async (uid, data, metadata) => mutate('update', uid, data, metadata),
         delete: async (uid, metadata) => mutate('delete', uid, {}, metadata),
      }),
   }
   const model = useSharedElectricModel(app, 'user_document')
   let rows
   const subscription = model.getObservable({ user_uid: 'owner' }).subscribe(value => { rows = value })
   electric.next([])
   const created = await model.create({ user_uid: 'owner', name: 'new' })
   assert(validate(created.uid))
   assert.deepEqual(rows, [created])
   electric.next([])
   assert.deepEqual(rows, [created])
   electric.next([created])

   const updated = await model.update(created.uid, { ...created, name: 'updated' })
   assert.deepEqual(rows, [updated])
   assert(!('version' in requests.at(-1).data))
   assert(!('deleted' in requests.at(-1).data))
   assert(!('uid' in requests.at(-1).data))
   electric.next([created])
   assert.deepEqual(rows, [updated])
   electric.next([updated])

   const tombstone = await model.remove(created.uid)
   assert.deepEqual(rows, [])
   electric.next([updated])
   assert.deepEqual(rows, [])
   electric.next([tombstone])
   assert.deepEqual(rows, [])
   assert.equal(await model.findUnique({ uid: created.uid }), null)

   const remote = { ...created, uid: 'remote', version: '100', name: 'remote' }
   electric.next([tombstone, remote])
   assert.deepEqual(rows, [remote])
   fail = true
   await assert.rejects(model.create({ user_uid: 'owner', name: 'failed' }))
   await assert.rejects(model.remove(remote.uid))
   assert.deepEqual(rows, [remote])
   assert.equal(new Set(requests.map(r => r.metadata.clientId)).size, 1)
   subscription.unsubscribe()
})

test('tab revisits replay cached rows immediately and cancel inactive streams', () => {
   const streams = []
   const app = {
      service: () => ({ findMany: () => new Promise(() => {}) }),
      createElectricModel: (_name, options) => {
         const rows = new Subject()
         streams.push({ rows, signal: options.streamOptions.signal })
         return { getObservable: () => rows }
      },
   }
   const model = useSharedElectricModel(app, 'user')
   let shown
   const first = model.getObservable().subscribe(rows => { shown = rows })
   const second = model.getObservable().subscribe()
   assert.equal(streams.length, 1)
   const cached = [{ uid: 'user', version: '1', deleted: false }]
   streams[0].rows.next(cached)
   first.unsubscribe()
   assert.equal(streams[0].signal.aborted, false)
   second.unsubscribe()
   assert.equal(streams[0].signal.aborted, true)
   shown = undefined
   const returning = model.getObservable().subscribe(rows => { shown = rows })
   assert.deepEqual(shown, cached)
   assert.equal(streams.length, 2)
   const refreshed = [{ ...cached[0], version: '2', name: 'updated' }]
   streams[1].rows.next(refreshed)
   assert.deepEqual(shown, refreshed)
   model.reset()
   assert.equal(streams[1].signal.aborted, true)
   assert.deepEqual(shown, [])
   returning.unsubscribe()
   model.reset()
   shown = undefined
   const nextSession = model.getObservable().subscribe(rows => { shown = rows })
   assert.equal(shown, undefined)
   nextSession.unsubscribe()
})

test('first visits use the socket snapshot and ignore it if Electric wins the race', async () => {
   let resolveSnapshot
   const electric = new Subject()
   const app = {
      service: () => ({ findMany: () => new Promise(resolve => { resolveSnapshot = resolve }) }),
      createElectricModel: () => ({ getObservable: () => electric }),
   }
   const model = useSharedElectricModel(app, 'user_document')
   let shown
   const subscription = model.getObservable().subscribe(rows => { shown = rows })
   const initial = [{ uid: 'doc', version: '1' }]
   resolveSnapshot(initial)
   await Promise.resolve()
   assert.deepEqual(shown, initial)
   const live = [{ uid: 'doc', version: '2', name: 'new' }]
   electric.next(live)
   assert.deepEqual(shown, live)
   model.reset()
   electric.next(live)
   resolveSnapshot(initial)
   await Promise.resolve()
   assert.deepEqual(shown, live)
   subscription.unsubscribe()
})
