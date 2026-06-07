import { makeFindUnique, makeFindMany } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('metadata', {
      findUnique: makeFindUnique(db, schema.metadata),
      findMany: makeFindMany(db, schema.metadata),
   })
}
