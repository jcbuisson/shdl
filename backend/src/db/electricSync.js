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
   return models
}
