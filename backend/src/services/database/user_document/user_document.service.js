import hooks from './user_document.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('user_document', {
      findUnique:     makeFindUnique(db, schema.user_document),
      findMany:       makeFindMany(db, schema.user_document),
      createWithMeta: makeCreateWithMeta(db, schema.user_document, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.user_document, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.user_document, schema.metadata),
   })

   app.service('user_document').hooks(hooks)
}
