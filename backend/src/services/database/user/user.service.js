import hooks from './user.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('user', {
      findUnique:     makeFindUnique(db, schema.user),
      findMany:       makeFindMany(db, schema.user),
      createWithMeta: makeCreateWithMeta(db, schema.user, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.user, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.user, schema.metadata),
   })

   app.service('user').hooks(hooks)
}
