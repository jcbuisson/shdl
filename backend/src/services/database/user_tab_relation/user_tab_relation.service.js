import hooks from './user_tab_relation.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('user_tab_relation', {
      findUnique:     makeFindUnique(db, schema.user_tab_relation),
      findMany:       makeFindMany(db, schema.user_tab_relation),
      createWithMeta: makeCreateWithMeta(db, schema.user_tab_relation, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.user_tab_relation, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.user_tab_relation, schema.metadata),
   })

   app.service('user_tab_relation').hooks(hooks)
}
