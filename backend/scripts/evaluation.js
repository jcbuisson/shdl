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
      const relations = await prisma.user_group_relations.findMany({ where: { groupUid: group.uid }});
      console.log('relations', relations);

      const sheet = workbook.addWorksheet(group.name);

      sheet.columns = [
         { header: 'ID', key: 'id', width: 10 },
         { header: 'Name', key: 'name', width: 20 },
         { header: 'Email', key: 'email', width: 30 },
      ]

      sheet.addRows([
         { id: 1, name: 'Alice', email: 'alice@test.com' },
         { id: 2, name: 'Bob', email: 'bob@test.com' },
      ])
   }

   // Save file
   await workbook.xlsx.writeFile('example.xlsx')
}

createExcel()
