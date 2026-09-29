import { pgTable as defineTable, text, integer, timestamp, pgEnum, unique, customType, boolean, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { requiredFields } from './electricSync.js'

const versionColumn = customType({ dataType: () => 'bigint', fromDriver: value => String(value) })

function pgTable(name, columns, extra = () => []) {
   return defineTable(name, {
      ...columns,
      version: versionColumn('version').notNull().default(sql`nextval('electric_sync_version_seq')`),
      deleted: boolean('deleted').notNull().default(false),
   }, table => [
      ...extra(table),
      check(name + '_live_required', sql`${table.deleted} OR (${sql.join(requiredFields[name].map(field => sql`${table[field]} IS NOT NULL`), sql` AND `)})`),
   ])
}

export const tabEnum = pgEnum('Tab', ['users', 'groups', 'tests', 'followup', 'workshop', 'grade'])

export const user = pgTable('user', {
   uid:       text('uid').notNull().unique(),
   email:     text('email').unique(),
   password:  text('password'),
   firstname: text('firstname'),
   lastname:  text('lastname'),
   pict:      text('pict').default('/static/img/avatar.svg'),
   notes:     text('notes'),
})

export const user_tab_relation = pgTable('user_tab_relation', {
   uid:      text('uid').notNull().unique(),
   user_uid: text('user_uid'),
   tab:      tabEnum('tab'),
}, (table) => [
   unique().on(table.user_uid, table.tab),
])

export const group = pgTable('group', {
   uid:  text('uid').notNull().unique(),
   name: text('name'),
})

export const user_group_relation = pgTable('user_group_relation', {
   uid:       text('uid').notNull().unique(),
   user_uid:  text('user_uid'),
   group_uid: text('group_uid'),
}, (table) => [
   unique().on(table.user_uid, table.group_uid),
])

export const group_slot = pgTable('group_slot', {
   uid:       text('uid').notNull().unique(),
   group_uid: text('group_uid'),
   name:      text('name'),
   start:     timestamp('start', { withTimezone: true }),
   end:       timestamp('end', { withTimezone: true }),
})

export const user_slot_excuse = pgTable('user_slot_excuse', {
   uid:            text('uid').notNull().unique(),
   user_uid:       text('user_uid'),
   group_slot_uid: text('group_slot_uid'),
}, (table) => [
   unique().on(table.user_uid, table.group_slot_uid),
])

export const test = pgTable('test', {
   uid:              text('uid').notNull().unique(),
   name:             text('name'),
   type:             text('type').default('shdl'), // 'shdl' or 'craps'
   weight:           integer('weight').default(1),
   test_statements:  text('test_statements'), // ex: "set rst 1\ncheck a 0"
   memory_contents:  text('memory_contents'), // ex: "[{ 0: 0, 1: 0xabc, 2: 123}]"
})

export const groupslot_test_relation = pgTable('groupslot_test_relation', {
   uid:              text('uid').notNull().unique(),
   group_slot_uid:   text('group_slot_uid'),
   test_uid:         text('test_uid'),
}, (table) => [
   unique().on(table.group_slot_uid, table.test_uid),
])

export const user_test_relation = pgTable('user_test_relation', {
   uid:            text('uid').notNull().unique(),
   user_uid:       text('user_uid'),
   test_uid:       text('test_uid'),
   first_try_date: timestamp('first_try_date', { withTimezone: true }),
   last_try_date:  timestamp('last_try_date', { withTimezone: true }),
   success_date:   timestamp('success_date', { withTimezone: true }),
   update_count:   integer('update_count').default(0),
   evaluation:     integer('evaluation'),
   last_module_name: text('last_module_name'),
}, (table) => [
   unique().on(table.user_uid, table.test_uid),
])

export const user_document = pgTable('user_document', {
   uid:          text('uid').notNull().unique(),
   user_uid:     text('user_uid'),
   type:         text('type'), // 'shdl', 'craps', 'text'
   name:         text('name'),
   text:         text('text'),
   update_count: integer('update_count').default(0),
})

export const user_document_event = pgTable('user_document_event', {
   uid:          text('uid').notNull().unique(),
   document_uid: text('document_uid'),
   type:         text('type'), // 'create', 'edit', 'delete', 'pass_test'
   start:        timestamp('start', { withTimezone: true }),
   end:          timestamp('end', { withTimezone: true }),
})
