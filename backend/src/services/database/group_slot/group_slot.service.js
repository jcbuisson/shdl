
import hooks from './group_slot.hooks.js'


export default function (app) {

   const prisma = app.get('prisma')

   app.createService('group_slot', {

      findUnique: prisma.group_slot.findUnique,

      findMany: prisma.group_slot.findMany,
      
      createWithMeta: async (uid, data, created_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.group_slot.create({ data: { uid, ...data } }),
            prisma.metadata.create({ data: { uid, created_at } })
         ])
         return [value, meta]
      },
      
      updateWithMeta: async (uid, data, updated_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.group_slot.update({ where: { uid }, data }),
            prisma.metadata.update({ where: { uid }, data: { updated_at } })
         ])
         return [value, meta]
      },
      
      deleteWithMeta: async (uid, deleted_at) => {
         const [value, meta] = await prisma.$transaction([
            prisma.group_slot.delete({ where: { uid } }),
            prisma.metadata.update({ where: { uid }, data: { deleted_at } })
         ])
         return [value, meta]
      },
   })

   app.service('group_slot').hooks(hooks)
}
