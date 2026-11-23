import { prepareElectricSyncSchema } from '@jcbuisson/express-x-plugins/electric-server'

// Required fields remain required for live rows, but tombstones clear business data.
export const requiredFields = {
   user: ['pict'],
   user_tab_relation: ['user_uid', 'tab'],
   group: ['name'],
   user_group_relation: ['user_uid', 'group_uid'],
   group_slot: ['group_uid', 'name', 'start', 'end'],
   user_slot_excuse: ['user_uid', 'group_slot_uid'],
   test: ['name', 'type', 'weight'],
   groupslot_test_relation: ['group_slot_uid', 'test_uid'],
   user_test_relation: ['user_uid', 'test_uid', 'update_count'],
   user_document: ['user_uid', 'type', 'name', 'text', 'update_count'],
   user_document_event: ['document_uid', 'type', 'start'],
}

export async function prepareSHDLSyncSchema(db) {
   const models = Object.keys(requiredFields).map(name => ({ name, primaryKey: 'uid' }))
   await prepareElectricSyncSchema(db, models)
   await db.query(`CREATE OR REPLACE FUNCTION shdl_sync_version() RETURNS trigger AS $$
      BEGIN
         IF NEW.version = OLD.version THEN
            NEW.version := nextval('electric_sync_version_seq');
         END IF;
         RETURN NEW;
      END;
   $$ LANGUAGE plpgsql`)
   for (const model of models) {
      const { rows: columns } = await db.query(`SELECT column_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = $1
         AND column_name NOT IN ('uid', 'version', 'deleted')`, [model.name])
      model.tombstoneData = Object.fromEntries(columns.map(({ column_name }) => [column_name, null]))
      const table = '"' + model.name + '"'
      for (const { column_name } of columns) {
         await db.query(`ALTER TABLE ${table} ALTER COLUMN "${column_name}" DROP NOT NULL`)
      }
      const constraint = model.name + '_live_required'
      const { rows } = await db.query('SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND conname = $2', [table, constraint])
      if (!rows.length) {
         const condition = requiredFields[model.name].map(field => '"' + field + '" IS NOT NULL').join(' AND ')
         await db.query(`ALTER TABLE ${table} ADD CONSTRAINT "${constraint}" CHECK (deleted OR (${condition}))`)
      }
      await db.query(`CREATE OR REPLACE TRIGGER shdl_sync_version BEFORE UPDATE ON ${table}
         FOR EACH ROW EXECUTE FUNCTION shdl_sync_version()`)
   }
   await db.query(`CREATE OR REPLACE FUNCTION shdl_check_slot_test_parents() RETURNS trigger AS $$
      BEGIN
         IF NEW.deleted THEN
            RETURN NEW;
         END IF;
         PERFORM 1 FROM group_slot WHERE uid = NEW.group_slot_uid AND NOT deleted FOR SHARE;
         IF NOT FOUND THEN
            RAISE EXCEPTION 'Assignment requires a live group slot' USING ERRCODE = '23503';
         END IF;
         PERFORM 1 FROM test WHERE uid = NEW.test_uid AND NOT deleted FOR SHARE;
         IF NOT FOUND THEN
            RAISE EXCEPTION 'Assignment requires a live test' USING ERRCODE = '23503';
         END IF;
         RETURN NEW;
      END;
   $$ LANGUAGE plpgsql`)
   await db.query(`CREATE OR REPLACE TRIGGER shdl_check_slot_test_parents
      BEFORE INSERT OR UPDATE OF group_slot_uid, test_uid, deleted ON groupslot_test_relation
      FOR EACH ROW EXECUTE FUNCTION shdl_check_slot_test_parents()`)

   await db.query(`CREATE OR REPLACE FUNCTION shdl_delete_slot_test_assignments() RETURNS trigger AS $$
      BEGIN
         IF TG_OP = 'UPDATE' THEN
            IF NEW.uid = OLD.uid AND (OLD.deleted OR NOT NEW.deleted) THEN
               RETURN NULL;
            END IF;
         END IF;
         IF TG_TABLE_NAME = 'group_slot' THEN
            UPDATE groupslot_test_relation
            SET deleted = true, group_slot_uid = NULL, test_uid = NULL
            WHERE NOT deleted AND group_slot_uid = OLD.uid;
         ELSE
            UPDATE groupslot_test_relation
            SET deleted = true, group_slot_uid = NULL, test_uid = NULL
            WHERE NOT deleted AND test_uid = OLD.uid;
         END IF;
         RETURN NULL;
      END;
   $$ LANGUAGE plpgsql`)
   for (const parent of ['group_slot', 'test']) {
      await db.query(`CREATE OR REPLACE TRIGGER shdl_delete_slot_test_assignments
         AFTER DELETE OR UPDATE OF uid, deleted ON "${parent}"
         FOR EACH ROW EXECUTE FUNCTION shdl_delete_slot_test_assignments()`)
   }
   await db.query(`UPDATE groupslot_test_relation AS relation
      SET deleted = true, group_slot_uid = NULL, test_uid = NULL
      WHERE NOT relation.deleted AND (
         NOT EXISTS (SELECT 1 FROM group_slot WHERE uid = relation.group_slot_uid AND NOT deleted)
         OR NOT EXISTS (SELECT 1 FROM test WHERE uid = relation.test_uid AND NOT deleted)
      )`)
   return models
}
