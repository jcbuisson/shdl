import hooks from './user_slot_excuse.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('user_slot_excuse', {
      findUnique:     makeFindUnique(db, schema.user_slot_excuse),
      findMany:       makeFindMany(db, schema.user_slot_excuse),
      createWithMeta: makeCreateWithMeta(db, schema.user_slot_excuse, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.user_slot_excuse, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.user_slot_excuse, schema.metadata),
   })

   app.service('user_slot_excuse').hooks(hooks)
}
