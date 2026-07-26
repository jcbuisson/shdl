// Solves the sync processes explosion problem, by creating only one sync process per model,
// with further local filtering

import { firstValueFrom, map, shareReplay } from 'rxjs'

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

   const model = app.createElectricModel(modelName)
   const rowsObservable = model.getObservable({}).pipe(
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

   const sharedModel = { ...model, getObservable, findMany }
   models.set(modelName, sharedModel)
   return sharedModel
}
