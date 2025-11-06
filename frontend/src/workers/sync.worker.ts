/**
 * Sync Worker - Handles synchronization operations in a separate thread
 *
 * This worker receives messages from the main thread to perform sync operations
 * and sends results back via postMessage.
 */

import Dexie from 'dexie'
import { Mutex } from '/src/lib/utilities'

// Worker-local state
const databases = new Map<string, Dexie>()
const mutexes = new Map<string, Mutex>()

// Types for worker messages
interface SyncMessage {
  type: 'SYNC' | 'SYNC_ALL' | 'INIT_DB' | 'RESET_DB'
  id: string // Message ID for response matching
  payload: any
}

interface SyncResponse {
  type: 'SYNC_SUCCESS' | 'SYNC_ERROR' | 'INIT_SUCCESS' | 'RESET_SUCCESS'
  id: string // Matches request message ID
  payload?: any
  error?: string
}

// Initialize a database in the worker context
function initDatabase(dbName: string, modelName: string, fields: string[]) {
  if (databases.has(dbName)) {
    return databases.get(dbName)!
  }

  const db = new Dexie(dbName)

  db.version(1).stores({
    whereList: "sortedjson",
    values: ['uid', '__deleted__', ...fields].join(','),
    metadata: "uid, created_at, updated_at, deleted_at",
  })

  databases.set(dbName, db)
  mutexes.set(modelName, new Mutex())

  return db
}

// Get database and mutex for a model
function getModelContext(dbName: string, modelName: string) {
  const db = databases.get(dbName)
  const mutex = mutexes.get(modelName)

  if (!db || !mutex) {
    throw new Error(`Database or mutex not initialized for ${modelName}`)
  }

  return { db, mutex }
}

// wherePredicate implementation (same as synchronize.js)
function wherePredicate(where: Record<string, any>) {
  return (elt: any) => {
    for (const [attr, value] of Object.entries(where)) {
      const eltAttrValue = elt[attr]

      if (typeof(value) === 'string' || typeof(value) === 'number') {
        // 'attr = value' clause
        if (eltAttrValue !== value) return false

      } else if (typeof(value) === 'object') {
        // 'attr = { lt/lte/gt/gte: value }' clause
        if (value.lte) {
          if (eltAttrValue > value.lte) return false
        } else if (value.lt) {
          if (eltAttrValue >= value.lt) return false
        } else if (value.gte) {
          if (eltAttrValue < value.gte) return false
        } else if (value.gt) {
          if (eltAttrValue <= value.gt) return false
        }
      }
    }
    return true
  }
}

/**
 * Core synchronization logic (adapted from synchronize.js)
 *
 * Note: This implementation requires app service calls to be sent back to main thread
 * since Socket.IO connection lives there.
 */
async function synchronizeInWorker(
  dbName: string,
  modelName: string,
  where: Record<string, any>,
  cutoffDate: Date | null,
  syncServiceData: any // Result from app.service('sync').go() - passed from main thread
) {
  const { db, mutex } = getModelContext(dbName, modelName)

  await mutex.acquire()
  console.log('[Worker] synchronize', modelName, where)

  try {
    const requestPredicate = wherePredicate(where)

    // Collect metadata of local values
    const valueList = await db.values.filter(requestPredicate).toArray()
    const clientMetadataDict: Record<string, any> = {}

    for (const value of valueList) {
      const metadata = await db.metadata.get(value.uid)
      if (metadata) {
        clientMetadataDict[value.uid] = metadata
      } else {
        clientMetadataDict[value.uid] = {}
      }
    }

    // Return metadata to main thread for sync service call
    return {
      step: 'METADATA_COLLECTED',
      clientMetadataDict
    }

  } catch (err) {
    console.error('[Worker] err synchronize', modelName, where, err)
    throw err
  } finally {
    mutex.release()
  }
}

/**
 * Apply sync results to local cache
 * This runs after main thread gets sync response from server
 */
async function applySyncResults(
  dbName: string,
  modelName: string,
  syncResults: {
    toAdd: Array<[any, any]>
    toUpdate: Array<any>
    toDelete: Array<[string, Date]>
  },
  updatedValues: Map<string, any> // Full values fetched from server by main thread
) {
  const { db, mutex } = getModelContext(dbName, modelName)

  await mutex.acquire()
  console.log('[Worker] applySyncResults', modelName, syncResults)

  try {
    // 1- Add missing elements in cache
    for (const [value, metaData] of syncResults.toAdd) {
      await db.values.add(value)
      await db.metadata.add(metaData)
    }

    // 2- Delete elements from cache
    for (const [uid, deleted_at] of syncResults.toDelete) {
      await db.values.delete(uid)
      await db.metadata.update(uid, { deleted_at })
    }

    // 3- Update elements of cache with pre-fetched values
    for (const elt of syncResults.toUpdate) {
      const value = updatedValues.get(elt.uid)
      if (!value) continue

      delete value.uid
      delete value.__deleted__
      await db.values.update(elt.uid, value)

      const metadata = await db.metadata.get(elt.uid)
      await db.metadata.update(elt.uid, { updated_at: metadata.updated_at })
    }

    return { success: true }

  } catch (err) {
    console.error('[Worker] err applySyncResults', modelName, err)
    throw err
  } finally {
    mutex.release()
  }
}

/**
 * Push local changes to database
 * This is called by main thread after it successfully creates/updates on server
 */
async function applyDatabaseSync(
  dbName: string,
  modelName: string,
  operations: {
    addDatabase: Array<{ uid: string }>
    updateDatabase: Array<{ uid: string }>
  }
) {
  const { db, mutex } = getModelContext(dbName, modelName)

  await mutex.acquire()
  console.log('[Worker] applyDatabaseSync', modelName, operations)

  try {
    // Collect full values for operations
    const addData = []
    for (const elt of operations.addDatabase) {
      const fullValue = await db.values.get(elt.uid)
      const meta = await db.metadata.get(elt.uid)
      if (fullValue && meta) {
        const data = { ...fullValue }
        delete data.uid
        delete data.__deleted__
        addData.push({ uid: elt.uid, data, created_at: meta.created_at })
      }
    }

    const updateData = []
    for (const elt of operations.updateDatabase) {
      const fullValue = await db.values.get(elt.uid)
      const meta = await db.metadata.get(elt.uid)
      if (fullValue && meta) {
        const data = { ...fullValue }
        delete data.uid
        delete data.__deleted__
        updateData.push({ uid: elt.uid, data, updated_at: meta.updated_at })
      }
    }

    return { addData, updateData }

  } catch (err) {
    console.error('[Worker] err applyDatabaseSync', modelName, err)
    throw err
  } finally {
    mutex.release()
  }
}

/**
 * Rollback operations after failed server sync
 */
async function rollbackOperation(
  dbName: string,
  modelName: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  uid: string,
  previousData?: any
) {
  const { db } = getModelContext(dbName, modelName)

  try {
    switch (operation) {
      case 'CREATE':
        await db.values.delete(uid)
        await db.metadata.delete(uid)
        break

      case 'UPDATE':
        if (previousData) {
          delete previousData.value.uid
          await db.values.update(uid, previousData.value)
          delete previousData.metadata.uid
          await db.metadata.update(uid, previousData.metadata)
        }
        break

      case 'DELETE':
        await db.values.update(uid, { __deleted__: null })
        await db.metadata.update(uid, { deleted_at: null })
        break
    }

    return { success: true }
  } catch (err) {
    console.error('[Worker] err rollback', operation, uid, err)
    throw err
  }
}

/**
 * Reset database (clear all tables)
 */
async function resetDatabase(dbName: string) {
  const db = databases.get(dbName)
  if (!db) {
    throw new Error(`Database not initialized: ${dbName}`)
  }

  await db.whereList.clear()
  await db.values.clear()
  await db.metadata.clear()

  return { success: true }
}

// Message handler
self.addEventListener('message', async (event: MessageEvent<SyncMessage>) => {
  const { type, id, payload } = event.data

  try {
    let result: any

    switch (type) {
      case 'INIT_DB':
        initDatabase(payload.dbName, payload.modelName, payload.fields)
        result = { success: true }
        self.postMessage({
          type: 'INIT_SUCCESS',
          id,
          payload: result
        } as SyncResponse)
        break

      case 'RESET_DB':
        result = await resetDatabase(payload.dbName)
        self.postMessage({
          type: 'RESET_SUCCESS',
          id,
          payload: result
        } as SyncResponse)
        break

      case 'SYNC':
        // Multi-step sync process
        if (payload.step === 'COLLECT_METADATA') {
          result = await synchronizeInWorker(
            payload.dbName,
            payload.modelName,
            payload.where,
            payload.cutoffDate,
            null
          )
        } else if (payload.step === 'APPLY_RESULTS') {
          result = await applySyncResults(
            payload.dbName,
            payload.modelName,
            payload.syncResults,
            new Map(Object.entries(payload.updatedValues))
          )
        } else if (payload.step === 'APPLY_DATABASE_SYNC') {
          result = await applyDatabaseSync(
            payload.dbName,
            payload.modelName,
            payload.operations
          )
        } else if (payload.step === 'ROLLBACK') {
          result = await rollbackOperation(
            payload.dbName,
            payload.modelName,
            payload.operation,
            payload.uid,
            payload.previousData
          )
        }

        self.postMessage({
          type: 'SYNC_SUCCESS',
          id,
          payload: result
        } as SyncResponse)
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }

  } catch (error) {
    console.error('[Worker] Error handling message:', error)
    self.postMessage({
      type: 'SYNC_ERROR',
      id,
      error: error instanceof Error ? error.message : String(error)
    } as SyncResponse)
  }
})

console.log('[Worker] Sync worker initialized')
