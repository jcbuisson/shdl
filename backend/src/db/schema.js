import { pgTable, text, integer, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'

export const tabEnum = pgEnum('Tab', ['users', 'groups', 'shdl_tests', 'craps_tests', 'followup', 'workshop', 'grade'])

export const metadata = pgTable('metadata', {
   uid:        text('uid').notNull().unique(),
   created_at: timestamp('created_at'),
   updated_at: timestamp('updated_at'),
   deleted_at: timestamp('deleted_at'),
})

export const user = pgTable('user', {
   uid:       text('uid').notNull().unique(),
   email:     text('email').unique(),
   password:  text('password'),
   firstname: text('firstname'),
   lastname:  text('lastname'),
   pict:      text('pict').notNull().default('/static/img/avatar.svg'),
   notes:     text('notes'),
})

export const user_tab_relation = pgTable('user_tab_relation', {
   uid:      text('uid').notNull().unique(),
   user_uid: text('user_uid').notNull(),
   tab:      tabEnum('tab').notNull(),
}, (table) => [
   unique().on(table.user_uid, table.tab),
])

export const group = pgTable('group', {
   uid:  text('uid').notNull().unique(),
   name: text('name').notNull(),
})

export const user_group_relation = pgTable('user_group_relation', {
   uid:       text('uid').notNull().unique(),
   user_uid:  text('user_uid').notNull(),
   group_uid: text('group_uid').notNull(),
}, (table) => [
   unique().on(table.user_uid, table.group_uid),
])

export const group_slot = pgTable('group_slot', {
   uid:       text('uid').notNull().unique(),
   group_uid: text('group_uid').notNull(),
   name:      text('name').notNull(),
   start:     timestamp('start').notNull(),
   end:       timestamp('end').notNull(),
})

export const user_slot_excuse = pgTable('user_slot_excuse', {
   uid:           text('uid').notNull().unique(),
   user_uid:      text('user_uid').notNull(),
   group_slot_uid: text('group_slot_uid').notNull(),
}, (table) => [
   unique().on(table.user_uid, table.group_slot_uid),
])

export const shdl_test = pgTable('shdl_test', {
   uid:              text('uid').notNull().unique(),
   name:             text('name').notNull(),
   weight:           integer('weight').notNull().default(1),
   test_statements:  text('test_statements'),
   memory_contents:  text('memory_contents'),
})

export const groupslot_shdltest_relation = pgTable('groupslot_shdltest_relation', {
   uid:           text('uid').notNull().unique(),
   group_slot_uid: text('group_slot_uid').notNull(),
   shdl_test_uid: text('shdl_test_uid').notNull(),
}, (table) => [
   unique().on(table.group_slot_uid, table.shdl_test_uid),
])

export const user_shdltest_relation = pgTable('user_shdltest_relation', {
   uid:           text('uid').notNull().unique(),
   user_uid:      text('user_uid').notNull(),
   shdl_test_uid: text('shdl_test_uid').notNull(),
   first_try_date: timestamp('first_try_date'),
   last_try_date:  timestamp('last_try_date'),
   success_date:   timestamp('success_date'),
   update_count:   integer('update_count').notNull().default(0),
   evaluation:     integer('evaluation'),
}, (table) => [
   unique().on(table.user_uid, table.shdl_test_uid),
])

export const user_document = pgTable('user_document', {
   uid:          text('uid').notNull().unique(),
   user_uid:     text('user_uid').notNull(),
   type:         text('type').notNull(),
   name:         text('name').notNull(),
   text:         text('text').notNull(),
   update_count: integer('update_count').notNull().default(0),
})

export const user_document_event = pgTable('user_document_event', {
   uid:          text('uid').notNull().unique(),
   document_uid: text('document_uid').notNull(),
   type:         text('type').notNull(),
   start:        timestamp('start').notNull(),
   end:          timestamp('end'),
})
