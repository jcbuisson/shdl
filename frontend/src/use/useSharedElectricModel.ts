// Solves the sync processes explosion problem, by creating only one sync process per model,
// with further local filtering

import { BehaviorSubject, Subject, EMPTY, catchError, combineLatest, concat, defer, filter, finalize, firstValueFrom, map, merge, of, shareReplay, startWith, switchMap, tap } from 'rxjs'
import { v7 as uuidv7 } from 'uuid'

const modelCache = new WeakMap()
const mutationClients = new WeakMap()

export function resetSharedElectricModels(app) {
   for (const model of modelCache.get(app)?.values() ?? []) model.reset()
}

function nextMutation(app) {
   if (!mutationClients.has(app)) mutationClients.set(app, { clientId: uuidv7(), revision: 0 })
   const client = mutationClients.get(app)
   return { clientId: client.clientId, revision: String(++client.revision) }
}

function mutationFields(data) {
   const { uid, version, deleted, ...fields } = data
   return fields
}

function comparable(value) {
   return value instanceof Date ? value.toISOString() : value
}

function matchesWhere(value, where) {
   return Object.entries(where).every(([field, constraint]) => {
      if (constraint === undefined) return true
      const actual = comparable(value[field])

      if (constraint && typeof constraint === 'object' && !Array.isArray(constraint)
         && !(constraint instanceof Date)) {
         return Object.entries(constraint).every(([operator, expectedValue]) => {
            const expected = comparable(expectedValue)
            if (operator === 'gt') return actual > expected
            if (operator === 'gte') return actual >= expected
            if (operator === 'lt') return actual < expected
            if (operator === 'lte') return actual <= expected
            throw new TypeError(`unsupported where constraint for '${field}'`)
         })
      }

      return actual === comparable(constraint)
   })
}

export function useSharedElectricModel(app, modelName) {
   let models = modelCache.get(app)
   if (!models) {
      models = new Map()
      modelCache.set(app, models)
   }
   if (models.has(modelName)) return models.get(modelName)

   const service = app.service(modelName)
   // Keep confirmed local mutations visible while Electric catches up.
   const pending = new BehaviorSubject(new Map())
   const resets = new Subject()
   let cachedRows
   let latestRows = new Map()
   const electricRows = resets.pipe(
      startWith(false),
      switchMap(reset => defer(() => {
         const controller = new AbortController()
         const model = app.createElectricModel(modelName, {
            primaryKey: 'uid', idGeneration: 'client',
            streamOptions: { signal: controller.signal, parser: { int8: value => value } },
         })
         // Replay without waiting for HTTP; then refresh through one shared stream.
         const initial = reset ? of([]) : cachedRows === undefined ? EMPTY : of(cachedRows)
         let receivedElectricRows = false
         const stream = model.getObservable({}).pipe(tap(() => { receivedElectricRows = true }))
         // A first visit can load via the existing WebSocket even if HTTP polls are queued.
         const snapshot = cachedRows === undefined ? defer(() => service.findMany({})).pipe(
            filter(() => !receivedElectricRows),
            catchError(() => EMPTY),
         ) : EMPTY
         return concat(initial, merge(stream, snapshot)).pipe(
            finalize(() => controller.abort()),
         )
      })),
      map(rows => {
         cachedRows = rows
         const byUid = new Map(rows.map(row => [row.uid, row]))
         latestRows = byUid
         for (const [uid, row] of pending.value) {
            const confirmed = byUid.get(uid)
            if (confirmed && BigInt(confirmed.version) >= BigInt(row.version)) pending.value.delete(uid)
         }
         return rows
      }),
   )
   const rowsObservable = combineLatest([electricRows, pending]).pipe(
      map(([rows, changes]) => {
         const byUid = new Map(rows.map(row => [row.uid, row]))
         for (const [uid, row] of changes) {
            byUid.set(uid, row)
         }
         return [...byUid.values()].filter(row => !row.deleted)
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
   )

   function getObservable(where = {}) {
      return rowsObservable.pipe(
         map(rows => rows.filter(value => matchesWhere(value, where))),
      )
   }

   function findMany(where = {}) {
      return firstValueFrom(getObservable(where))
   }

   async function create(data) {
      // Pass both arguments explicitly: plugin 5.0.1's automatic-ID path drops the data.
      const uid = data.uid ?? uuidv7()
      const row = await service.create(uid, mutationFields(data), nextMutation(app))
      publishMutation(uid, row)
      return row
   }

   async function remove(uid) {
      const row = await service.delete(uid, nextMutation(app))
      publishMutation(uid, row)
      return row
   }

   function publishMutation(uid, row) {
      const confirmed = latestRows.get(uid)
      const newerPending = pending.value.get(uid)
      if (newerPending && BigInt(newerPending.version) >= BigInt(row.version)) return
      if (!confirmed || BigInt(confirmed.version) < BigInt(row.version)) {
         pending.next(new Map(pending.value).set(uid, row))
      }
   }

   async function update(uid, data) {
      const row = await service.update(uid, mutationFields(data), nextMutation(app))
      publishMutation(uid, row)
      return row
   }

   async function findUnique(where) {
      return (await findMany(where))[0] ?? null
   }

   function reset() {
      cachedRows = undefined
      latestRows = new Map()
      pending.next(new Map())
      resets.next(true)
   }

   const sharedModel = { create, update, remove, getObservable, findMany, findUnique, reset }
   models.set(modelName, sharedModel)
   return sharedModel
}
