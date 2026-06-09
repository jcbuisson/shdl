import hooks from './test.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('test', {
      findUnique:     makeFindUnique(db, schema.test),
      findMany:       makeFindMany(db, schema.test),
      createWithMeta: makeCreateWithMeta(db, schema.test, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.test, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.test, schema.metadata),
   })

   app.service('test').hooks(hooks)
}
