/**
 * Worker-based Synchronization - Orchestrates sync using Web Worker
 *
 * This module provides the same API as synchronize.js but delegates heavy
 * operations to a Web Worker to avoid blocking the main thread.
 *
 * The sync process is split into multiple steps:
 * 1. Worker collects metadata from its IndexedDB
 * 2. Main thread calls sync service on server
 * 3. Main thread fetches updated values from server
 * 4. Worker applies changes to its IndexedDB
 * 5. Main thread pushes local changes to server
 */

import { workerBridge } from './workerBridge'

/**
 * Worker-based synchronization
 *
 * @param app - Express-X client app (for service calls)
 * @param modelName - Model name (e.g., 'user', 'group')
 * @param dbName - IndexedDB database name
 * @param where - Filter predicate (e.g., { user_uid: 'abc' })
 * @param cutoffDate - Date of last disconnection (for delta sync)
 */
export async function synchronizeWithWorker(
  app: any,
  modelName: string,
  dbName: string,
  where: Record<string, any>,
  cutoffDate: Date | null
) {
  console.log('[SyncWorker] Starting sync:', modelName, where)

  try {
    // Step 1: Collect metadata from worker's IndexedDB
    const { clientMetadataDict } = await workerBridge.collectMetadata(
      dbName,
      modelName,
      where,
      cutoffDate
    )

    // Step 2: Call sync service on server (main thread, uses Socket.IO)
    const { toAdd, toUpdate, toDelete, addDatabase, updateDatabase } =
      await app.service('sync').go(modelName, where, cutoffDate, clientMetadataDict)

    console.log('[SyncWorker] Server response:', {
      toAdd: toAdd.length,
      toUpdate: toUpdate.length,
      toDelete: toDelete.length,
      addDatabase: addDatabase.length,
      updateDatabase: updateDatabase.length
    })

    // Step 3: Fetch full values for updates (in parallel)
    const updatedValues: Record<string, any> = {}

    if (toUpdate.length > 0) {
      // Fetch all updated values in parallel
      const fetchPromises = toUpdate.map(async (elt: any) => {
        try {
          const value = await app.service(modelName).findUnique({ where: { uid: elt.uid } })
          return [elt.uid, value]
        } catch (error) {
          console.error(`[SyncWorker] Failed to fetch ${elt.uid}:`, error)
          return [elt.uid, null]
        }
      })

      const results = await Promise.all(fetchPromises)
      for (const [uid, value] of results) {
        if (value) {
          updatedValues[uid] = value
        }
      }
    }

    // Step 4: Apply sync results to worker's cache
    await workerBridge.applySyncResults(dbName, modelName, {
      toAdd,
      toUpdate,
      toDelete
    }, updatedValues)

    // Step 5: Collect local changes to push to server
    const { addData, updateData } = await workerBridge.collectDatabaseSync(
      dbName,
      modelName,
      { addDatabase, updateDatabase }
    )

    // Step 6: Push creates to server
    for (const { uid, data, created_at } of addData) {
      try {
        await app.service(modelName).createWithMeta(uid, data, created_at)
      } catch (err) {
        console.error(`[SyncWorker] Failed to create ${uid}:`, err)
        // Rollback in worker
        await workerBridge.rollback(dbName, modelName, 'CREATE', uid)
      }
    }

    // Step 7: Push updates to server
    for (const { uid, data, updated_at } of updateData) {
      try {
        await app.service(modelName).updateWithMeta(uid, data, updated_at)
      } catch (err) {
        console.error(`[SyncWorker] Failed to update ${uid}:`, err)
        // Rollback in worker (need to fetch previous value)
        try {
          const previousValue = await app.service(modelName).findUnique({ where: { uid } })
          const previousMetadata = await app.service('metadata').findUnique({ where: { uid } })
          await workerBridge.rollback(dbName, modelName, 'UPDATE', uid, {
            value: previousValue,
            metadata: previousMetadata
          })
        } catch (rollbackErr) {
          console.error(`[SyncWorker] Rollback failed for ${uid}:`, rollbackErr)
        }
      }
    }

    console.log('[SyncWorker] Sync completed:', modelName, where)

  } catch (error) {
    console.error('[SyncWorker] Sync failed:', modelName, where, error)
    throw error
  }
}

/**
 * Initialize a model's database in the worker
 * Call this once per model when the app starts
 */
export async function initWorkerDatabase(
  dbName: string,
  modelName: string,
  fields: string[]
) {
  await workerBridge.initDatabase(dbName, modelName, fields)
}

/**
 * Reset a model's database in the worker
 */
export async function resetWorkerDatabase(dbName: string) {
  await workerBridge.resetDatabase(dbName)
}
