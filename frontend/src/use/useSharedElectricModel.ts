// Solves the sync processes explosion problem, by creating only one sync process per model,
// with further local filtering

import { BehaviorSubject, combineLatest, firstValueFrom, map, shareReplay } from 'rxjs'
import { v7 as uuidv7 } from 'uuid'

const modelCache = new WeakMap()

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

   const model = app.createElectricModel(modelName, { primaryKey: 'uid', idGeneration: 'client' })
   // Keep confirmed local creates/deletes visible while Electric catches up.
   const pending = new BehaviorSubject(new Map())
   let latestRows = new Map()
   const electricRows = model.getObservable({}).pipe(
      map(rows => {
         const byUid = new Map(rows.map(row => [row.uid, row]))
         latestRows = byUid
         for (const [uid, row] of pending.value) {
            if (row === null ? !byUid.has(uid) : byUid.has(uid)) pending.value.delete(uid)
         }
         return rows
      }),
   )
   const rowsObservable = combineLatest([electricRows, pending]).pipe(
      map(([rows, changes]) => {
         const byUid = new Map(rows.map(row => [row.uid, row]))
         for (const [uid, row] of changes) {
            if (row === null) byUid.delete(uid)
            else if (!byUid.has(uid)) byUid.set(uid, row)
         }
         return [...byUid.values()]
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
      const { uid = uuidv7(), ...fields } = data
      const row = await model.create(uid, fields)
      if (!latestRows.has(uid)) pending.next(new Map(pending.value).set(uid, row))
      return row
   }

   async function remove(uid) {
      const row = await model.remove(uid)
      pending.next(new Map(pending.value).set(uid, null))
      return row
   }

   const sharedModel = { ...model, create, remove, getObservable, findMany }
   models.set(modelName, sharedModel)
   return sharedModel
}
