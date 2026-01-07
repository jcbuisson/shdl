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

      // collect all tests for the slots of this group
      const groupSlots = await prisma.group_slot.findMany({ where: { group_uid: group.uid }});
      const groupTests = new Set();
      for (const groupSlot of groupSlots) {
         const groupslotShdltestRelations = await prisma.groupslot_shdltest_relation.findMany({ where: { group_slot_uid: groupSlot.uid }});
         for (const groupslotShdltestRelation of groupslotShdltestRelations) {
            const shdlTest = await prisma.shdl_test.findUnique({ where: { uid: groupslotShdltestRelation.shdl_test_uid }})
            groupTests.add(shdlTest);
         }
      }
      const sortedGroupTestList = [...groupTests].sort((a, b) => a.name.localeCompare(b.name));

      sheet.columns = [
         { header: 'Nom', key: 'lastname', width: 20 },
         { header: 'Prénom', key: 'firstname', width: 20 },
         { header: 'Email', key: 'email', width: 30 },
         { header: 'Remarques', key: 'note', width: 30 },
         { header: 'Note / 20', key: 'mark', width: 10 },
         ...sortedGroupTestList.map(test => ({ header: test.name, key: test.uid, width: 20 })),
      ]
      const weightRow = {};
      for (const test of groupTests) {
         weightRow[test.uid] = test.weight;
      }
      sheet.addRow(weightRow);


      const userGroupRelations = await prisma.user_group_relation.findMany({ where: { group_uid: group.uid }});
      for (const userGroupRelation of userGroupRelations) {
         const user = await prisma.user.findUnique({ where: { uid: userGroupRelation.user_uid }});
         const row = {
            lastname: user.lastname,
            firstname: user.firstname,
            email: user.email,
            note: user.note,
         }
         let markSum = 0;
         let markWeight = 0;
         for (const test of groupTests) {
            const [userTestRelation] = await prisma.user_shdltest_relation.findMany({ where: { user_uid: user.uid, shdl_test_uid: test.uid }});
            let evaluation = 0;
            if (userTestRelation) {
               if (userTestRelation.evaluation) {
                  evaluation = userTestRelation.evaluation;
               } else if (userTestRelation.success_date) {
                  evaluation = 100;
               }
            }
            markSum += evaluation * test.weight;
            markWeight += test.weight
            row[test.uid] = evaluation;
         }
         row['mark'] = Math.round((markSum / markWeight) / 5);
         sheet.addRow(row);
      }
   }

   // Save file
   await workbook.xlsx.writeFile('eval_archi_1SN25.xlsx')
}

createExcel()
