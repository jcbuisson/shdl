import hooks from './user_document_event.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('user_document_event', {
      findUnique:     makeFindUnique(db, schema.user_document_event),
      findMany:       makeFindMany(db, schema.user_document_event),
      createWithMeta: makeCreateWithMeta(db, schema.user_document_event, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.user_document_event, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.user_document_event, schema.metadata),
   })

   app.service('user_document_event').hooks(hooks)
}
