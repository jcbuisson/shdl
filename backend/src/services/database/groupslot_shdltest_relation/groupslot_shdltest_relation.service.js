
import hooks from './groupslot_shdltest_relation.hooks.js'


export default function (app) {

   const prisma = app.get('prisma')

   app.createService('groupslot_shdltest_relation', {

      findUnique: prisma.groupslot_shdltest_relation.findUnique,

      findMany: prisma.groupslot_shdltest_relation.findMany,
      
      createWithMeta: async (uid, data, created_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.groupslot_shdltest_relation.create({ data: { uid, ...data } }),
            prisma.metadata.create({ data: { uid, created_at } })
         ])
         return [value, meta]
      },
      
      updateWithMeta: async (uid, data, updated_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.groupslot_shdltest_relation.update({ where: { uid }, data }),
            prisma.metadata.update({ where: { uid }, data: { updated_at } })
         ])
         return [value, meta]
      },
      
      deleteWithMeta: async (uid, deleted_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.groupslot_shdltest_relation.delete({ where: { uid } }),
            prisma.metadata.update({ where: { uid }, data: { deleted_at } })
         ])
         return [value, meta]
      },
   })

   app.service('groupslot_shdltest_relation').hooks(hooks)
}
