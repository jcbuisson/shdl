import { firstValueFrom, map, shareReplay } from 'rxjs'

let modelInstance = null
let documentsObservable = null

function matchesWhere(document, where) {
   return Object.entries(where).every(([field, expected]) => (
      expected === undefined || document[field] === expected
   ))
}

export function useUserDocument(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('user_document')
      documentsObservable = modelInstance.getObservable({}).pipe(
         shareReplay({ bufferSize: 1, refCount: true }),
      )
   }

   function getObservable(where = {}) {
      return documentsObservable.pipe(
         map(documents => documents.filter(document => matchesWhere(document, where))),
      )
   }

   function findMany(where = {}) {
      return firstValueFrom(getObservable(where))
   }

   return { ...modelInstance, getObservable, findMany }
}
