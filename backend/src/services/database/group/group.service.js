import hooks from './group.hooks.js'
import { makeFindUnique, makeFindMany, makeCreateWithMeta, makeUpdateWithMeta, makeDeleteWithMeta } from '#root/src/db/helpers.js'
import * as schema from '#root/src/db/schema.js'

export default function (app) {
   const db = app.get('db')

   app.createService('group', {
      findUnique:     makeFindUnique(db, schema.group),
      findMany:       makeFindMany(db, schema.group),
      createWithMeta: makeCreateWithMeta(db, schema.group, schema.metadata),
      updateWithMeta: makeUpdateWithMeta(db, schema.group, schema.metadata),
      deleteWithMeta: makeDeleteWithMeta(db, schema.group, schema.metadata),
   })

   app.service('group').hooks(hooks)
}
