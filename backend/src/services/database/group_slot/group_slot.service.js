import hooks from './group_slot.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('group_slot', {
      findUnique:     makeFindUnique(db, schema.group_slot),
      findMany:       makeFindMany(db, schema.group_slot),
      createWithMeta: makeCreateWithMeta(db, schema.group_slot, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.group_slot, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.group_slot, schema.metadata),
   })

   app.service('group_slot').hooks(hooks)
}
