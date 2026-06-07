import hooks from './groupslot_shdltest_relation.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('groupslot_shdltest_relation', {
      findUnique:     makeFindUnique(db, schema.groupslot_shdltest_relation),
      findMany:       makeFindMany(db, schema.groupslot_shdltest_relation),
      createWithMeta: makeCreateWithMeta(db, schema.groupslot_shdltest_relation, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.groupslot_shdltest_relation, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.groupslot_shdltest_relation, schema.metadata),
   })

   app.service('groupslot_shdltest_relation').hooks(hooks)
}
