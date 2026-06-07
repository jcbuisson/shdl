import hooks from './shdl_test.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('shdl_test', {
      findUnique:     makeFindUnique(db, schema.shdl_test),
      findMany:       makeFindMany(db, schema.shdl_test),
      createWithMeta: makeCreateWithMeta(db, schema.shdl_test, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.shdl_test, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.shdl_test, schema.metadata),
   })

   app.service('shdl_test').hooks(hooks)
}
