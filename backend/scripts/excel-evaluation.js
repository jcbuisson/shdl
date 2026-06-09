import ExcelJS from 'exceljs'
import { eq, and } from 'drizzle-orm'

import config from '#config'
import { createDB } from '#root/src/db/index.js'
import * as schema from '#root/src/db/schema.js'


async function createExcel() {
   const workbook = new ExcelJS.Workbook()
   const db = createDB(config.DATABASE_URL)

   const groupNames = [
      '1SN25A', '1SN25B', '1SN25C', '1SN25D', '1SN25E', '1SN25F', '1SN25G', '1SN25H', '1SN25I', '1SN25J', '1SN25K', '1SN25L', '1SN25M', '1SN25N',
   ]

   const acceptedTestNames = [
      'adder32_test', 'adder8_test', 'addsub32_test', 'cal_max_test', 'count_012789_test', 'count_init4_test', 'count_init8_test',
      'count4_b1_b2_test', 'count4_test', 'decoder3to8_test', 'etats_cal_max_test', 'etats_tri_selection_test',
      'max_tab_test', 'reg8_D_test', 'reg8_T_test', 'test_fulladder', 'tri_selection_int_test', 'tri_selection_test', 'ucmp2_test',
   ]

   for (const groupName of groupNames) {
      const groups = await db.select().from(schema.group).where(eq(schema.group.name, groupName))
      const group = groups[0]
      if (!group) {
         console.log(`*** pas de groupe ${groupName}`)
         continue
      }

      const sheet = workbook.addWorksheet(group.name)

      const groupSlots = await db.select().from(schema.group_slot).where(eq(schema.group_slot.group_uid, group.uid))
      const groupTests = []
      for (const groupSlot of groupSlots) {
         const gsRelations = await db.select().from(schema.groupslot_test_relation)
            .where(eq(schema.groupslot_test_relation.group_slot_uid, groupSlot.uid))
         for (const rel of gsRelations) {
            const tests = await db.select().from(schema.test).where(eq(schema.test.uid, rel.test_uid)).limit(1)
            const shdlTest = tests[0]
            if (shdlTest && !groupTests.some(t => t.uid === shdlTest.uid) && acceptedTestNames.includes(shdlTest.name)) {
               groupTests.push(shdlTest)
            }
         }
      }
      const sortedGroupTestList = groupTests.sort((a, b) => a.name.localeCompare(b.name))

      sheet.columns = [
         { header: 'Nom', key: 'lastname', width: 20 },
         { header: 'Prénom', key: 'firstname', width: 20 },
         { header: 'Email', key: 'email', width: 30 },
         { header: 'Remarques', key: 'note', width: 30 },
         { header: '% présence', key: 'attendance', width: 10 },
         { header: 'Note / 20', key: 'mark', width: 10 },
         ...sortedGroupTestList.map(test => ({ header: test.name, key: test.uid, width: 20 })),
      ]
      const weightRow = {}
      for (const test of groupTests) {
         weightRow[test.uid] = test.weight
      }
      sheet.addRow(weightRow)

      const userGroupRelations = await db.select().from(schema.user_group_relation)
         .where(eq(schema.user_group_relation.group_uid, group.uid))
      const users = []
      for (const rel of userGroupRelations) {
         const rows = await db.select().from(schema.user).where(eq(schema.user.uid, rel.user_uid)).limit(1)
         if (rows[0]) users.push(rows[0])
      }
      const sortedUsers = users.sort((a, b) => a.lastname.localeCompare(b.lastname))

      for (const user of sortedUsers) {
         const row = {
            lastname: user.lastname,
            firstname: user.firstname,
            email: user.email,
            note: user.note,
         }
         // compute attendance
         let total = 0
         let count = 0
         const userDocuments = await db.select().from(schema.user_document).where(eq(schema.user_document.user_uid, user.uid))
         for (const groupSlot of groupSlots) {
            const userExcuses = await db.select().from(schema.user_slot_excuse)
               .where(and(eq(schema.user_slot_excuse.user_uid, user.uid), eq(schema.user_slot_excuse.group_slot_uid, groupSlot.uid)))
            if (userExcuses.length > 0) continue

            const slotStart = new Date(groupSlot.start)
            const slotEnd = new Date(groupSlot.end)
            let isAttendingSlot = false
            for (const userDocument of userDocuments) {
               const events = await db.select().from(schema.user_document_event)
                  .where(eq(schema.user_document_event.document_uid, userDocument.uid))
               for (const event of events) {
                  const eventStart = new Date(event.start)
                  if (eventStart >= slotStart && eventStart <= slotEnd) {
                     isAttendingSlot = true
                     break
                  }
               }
               if (isAttendingSlot) break
            }
            if (isAttendingSlot) count += 1
            total += 1
         }
         row['attendance'] = Math.floor(count * 100 / total)

         // compute mark
         let markSum = 0
         let markWeight = 0
         for (const test of groupTests) {
            const relations = await db.select().from(schema.user_test_relation)
               .where(and(eq(schema.user_test_relation.user_uid, user.uid), eq(schema.user_test_relation.test_uid, test.uid)))
            const userTestRelation = relations[0]
            let evaluation = 0
            if (userTestRelation) {
               if (userTestRelation.evaluation) {
                  evaluation = userTestRelation.evaluation
               } else if (userTestRelation.success_date) {
                  evaluation = 100
               }
            }
            markSum += evaluation * test.weight
            markWeight += test.weight
            row[test.uid] = evaluation
         }
         const mark = Math.round((markSum / markWeight) / 5)
         console.log(user.lastname, markSum, markWeight, mark)
         row['mark'] = mark
         sheet.addRow(row)
      }
   }

   await workbook.xlsx.writeFile('eval_archi_1SN25.xlsx')
}

createExcel()
