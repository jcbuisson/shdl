import ExcelJS from 'exceljs'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'


async function createExcel() {
   const workbook = new ExcelJS.Workbook();
   const prisma = new PrismaClient();

   const groupNames = [
      '1SN25A', '1SN25B', '1SN25C', '1SN25D', '1SN25E', '1SN25F', '1SN25G', '1SN25H', '1SN25I', '1SN25J', '1SN25K', '1SN25L', '1SN25M', '1SN25N',
   ]

   for (const groupName of groupNames) {
      const [group] = await prisma.group.findMany({ where: { name: groupName }});
      if (!group) {
         console.log(`*** pas de groupe ${groupName}`);
         continue;
      }      

      const sheet = workbook.addWorksheet(group.name);

      const groupSlots = await prisma.group_slot.findMany({ where: { group_uid: group.uid }});
      console.log(group.name, groupSlots);

      sheet.columns = [
         { header: 'Nom', key: 'lastname', width: 20 },
         { header: 'Prénom', key: 'firstname', width: 20 },
         { header: 'Email', key: 'email', width: 30 },
         { header: 'Note', key: 'note', width: 30 },
      ]

      const userGroupRelations = await prisma.user_group_relation.findMany({ where: { group_uid: group.uid }});
      for (const userGroupRelation of userGroupRelations) {
         const user = await prisma.user.findUnique({ where: { uid: userGroupRelation.user_uid }})

         sheet.addRow({
            lastname: user.lastname,
            firstname: user.firstname,
            email: user.email,
            note: user.note,
         })
      }
   }

   // Save file
   await workbook.xlsx.writeFile('eval_archi_1SN25.xlsx')
}

createExcel()
