/**
 * Worker Bridge - Main thread interface to the Sync Worker
 *
 * Provides a Promise-based API for communicating with the sync worker.
 * Handles message passing, response matching, and error handling.
 */

import SyncWorker from '../workers/sync.worker?worker'

// Message ID counter for matching requests/responses
let messageIdCounter = 0

interface PendingMessage {
  resolve: (value: any) => void
  reject: (error: Error) => void
}

class WorkerBridge {
  private worker: Worker | null = null
  private pendingMessages = new Map<string, PendingMessage>()
  private initialized = false

  constructor() {
    this.initWorker()
  }

  private initWorker() {
    if (this.worker) {
      return
    }

    try {
      this.worker = new SyncWorker()

      this.worker.addEventListener('message', (event) => {
        this.handleWorkerMessage(event.data)
      })

      this.worker.addEventListener('error', (event) => {
        console.error('[WorkerBridge] Worker error:', event)
      })

      this.initialized = true
      console.log('[WorkerBridge] Sync worker initialized')
    } catch (error) {
      console.error('[WorkerBridge] Failed to initialize worker:', error)
      throw error
    }
  }

  private handleWorkerMessage(response: any) {
    const { id, type, payload, error } = response

    const pending = this.pendingMessages.get(id)
    if (!pending) {
      console.warn('[WorkerBridge] Received response for unknown message:', id)
      return
    }

    this.pendingMessages.delete(id)

    if (type.endsWith('_ERROR') || error) {
      pending.reject(new Error(error || 'Unknown worker error'))
    } else {
      pending.resolve(payload)
    }
  }

  private sendMessage(type: string, payload: any): Promise<any> {
    if (!this.worker) {
      return Promise.reject(new Error('Worker not initialized'))
    }

    const id = `msg_${++messageIdCounter}`

    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject })

      this.worker!.postMessage({
        type,
        id,
        payload
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id)
          reject(new Error(`Worker operation timed out: ${type}`))
        }
      }, 30000)
    })
  }

  /**
   * Initialize a database in the worker
   */
  async initDatabase(dbName: string, modelName: string, fields: string[]): Promise<void> {
    await this.sendMessage('INIT_DB', { dbName, modelName, fields })
  }

  /**
   * Reset a database (clear all tables)
   */
  async resetDatabase(dbName: string): Promise<void> {
    await this.sendMessage('RESET_DB', { dbName })
  }

  /**
   * Step 1: Collect metadata from worker's IndexedDB
   */
  async collectMetadata(
    dbName: string,
    modelName: string,
    where: Record<string, any>,
    cutoffDate: Date | null
  ): Promise<{ clientMetadataDict: Record<string, any> }> {
    return await this.sendMessage('SYNC', {
      step: 'COLLECT_METADATA',
      dbName,
      modelName,
      where,
      cutoffDate
    })
  }

  /**
   * Step 2: Apply sync results from server to worker's cache
   */
  async applySyncResults(
    dbName: string,
    modelName: string,
    syncResults: {
      toAdd: Array<[any, any]>
      toUpdate: Array<any>
      toDelete: Array<[string, Date]>
    },
    updatedValues: Record<string, any> // uid -> full value map
  ): Promise<{ success: boolean }> {
    return await this.sendMessage('SYNC', {
      step: 'APPLY_RESULTS',
      dbName,
      modelName,
      syncResults,
      updatedValues
    })
  }

  /**
   * Step 3: Collect local changes to push to database
   */
  async collectDatabaseSync(
    dbName: string,
    modelName: string,
    operations: {
      addDatabase: Array<{ uid: string }>
      updateDatabase: Array<{ uid: string }>
    }
  ): Promise<{
    addData: Array<{ uid: string; data: any; created_at: Date }>
    updateData: Array<{ uid: string; data: any; updated_at: Date }>
  }> {
    return await this.sendMessage('SYNC', {
      step: 'APPLY_DATABASE_SYNC',
      dbName,
      modelName,
      operations
    })
  }

  /**
   * Rollback an operation after server sync failure
   */
  async rollback(
    dbName: string,
    modelName: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    uid: string,
    previousData?: any
  ): Promise<{ success: boolean }> {
    return await this.sendMessage('SYNC', {
      step: 'ROLLBACK',
      dbName,
      modelName,
      operation,
      uid,
      previousData
    })
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.initialized = false
      this.pendingMessages.clear()
      console.log('[WorkerBridge] Worker terminated')
    }
  }
}

// Singleton instance
export const workerBridge = new WorkerBridge()

// Export for cleanup on app unmount
export function terminateWorker() {
  workerBridge.terminate()
}
