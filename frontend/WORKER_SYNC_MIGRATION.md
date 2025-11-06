# Worker-Based Synchronization Migration Guide

This guide explains how to migrate from main-thread synchronization to Web Worker-based synchronization for better performance and non-blocking UI.

## Overview

The new worker-based sync system moves heavy synchronization operations (IndexedDB queries, metadata comparison, data fetching) to a separate Web Worker thread, preventing UI blocking during large sync operations.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Main Thread                          │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Vue App    │───▶│  useModel.ts │───▶│  Socket.IO   │  │
│  │  Components  │    │  (Composable)│    │   Client     │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────┐                      │
│                    │  workerBridge.ts │                      │
│                    │  (Message Proxy) │                      │
│                    └────────┬─────────┘                      │
│                             │ postMessage                    │
└─────────────────────────────┼─────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Worker Thread                           │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ sync.worker  │───▶│    Dexie     │───▶│  IndexedDB   │  │
│  │     .ts      │    │  (Database)  │    │   (Cache)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
frontend/src/
├── workers/
│   └── sync.worker.ts           # Web Worker - handles sync operations
├── lib/
│   ├── synchronize.js           # Original main-thread sync (unchanged)
│   ├── synchronizeWorker.ts    # Worker-based sync orchestrator
│   └── workerBridge.ts          # Promise-based worker communication
└── use/
    └── useModel.ts              # Updated with worker migration comments
```

## Migration Steps

### Option A: Gradual Migration (Recommended)

Migrate one model at a time to test stability.

#### Step 1: Enable Worker for One Model

Edit a specific composable (e.g., `useUser.js`):

```typescript
import useModel from './useModel'
import { synchronizeWithWorker, initWorkerDatabase } from '/src/lib/synchronizeWorker'
import { app, isConnected, disconnectedDate } from '/src/client-app.js'

const { db, create, update, remove, getObservable, synchronizeAll, ...rest } =
   useModel('user-db', 'user', ['email', 'firstname', 'lastname', 'pict', 'notes'])

// Initialize worker database on first load
initWorkerDatabase('user-db', 'user', ['email', 'firstname', 'lastname', 'pict', 'notes'])

// Override synchronizeAll with worker version
const synchronizeAllWorker = async () => {
   // Get all registered "where" clauses
   const whereList = await db.whereList.toArray()

   for (const { sortedjson } of whereList) {
      const where = JSON.parse(sortedjson)
      await synchronizeWithWorker(app, 'user', 'user-db', where, disconnectedDate.value)
   }
}

export default function useUser() {
   return {
      ...rest,
      db,
      create,
      update,
      remove,
      getObservable, // Still uses main thread for now
      synchronizeAll: synchronizeAllWorker, // Worker version
   }
}
```

#### Step 2: Test the Model

1. Start the dev server: `npm run dev`
2. Open browser DevTools → Application → IndexedDB
3. Test CRUD operations on the migrated model
4. Check Console for worker logs: `[Worker] synchronize user ...`
5. Monitor Network tab for sync requests

#### Step 3: Migrate getObservable (Optional)

For real-time sync on new subscriptions, update the model:

```typescript
// In useModel.ts or specific composable
function getObservable(where = {}) {
   addSynchroWhere(where).then((isNew: boolean) => {
      if (isNew && isConnected.value) {
         // Switch to worker
         synchronizeWithWorker(app, modelName, dbName, where, disconnectedDate.value)
      }
   })
   const predicate = wherePredicate(where)
   return from(liveQuery(() => db.values.filter(value => !value.__deleted__ && predicate(value)).toArray()))
}
```

#### Step 4: Migrate Remaining Models

Repeat Steps 1-3 for each model:
- `useGroup.ts`
- `useUserDocument.ts`
- `useUserDocumentEvent.ts`
- `useSHDLTest.ts`
- etc.

### Option B: Full Migration

Migrate all models at once by updating `useModel.ts` directly.

#### Step 1: Update useModel.ts

```typescript
// At the top of useModel.ts
import { synchronizeWithWorker, initWorkerDatabase } from '/src/lib/synchronizeWorker'

export default function(dbName: string, modelName: string, fields) {
   const db = new Dexie(dbName)

   db.version(1).stores({
      whereList: "sortedjson",
      values: ['uid', '__deleted__', ...fields].join(','),
      metadata: "uid, created_at, updated_at, deleted_at",
   })

   // Initialize worker database
   initWorkerDatabase(dbName, modelName, fields)

   // ... rest of the code ...

   function getObservable(where = {}) {
      addSynchroWhere(where).then((isNew: boolean) => {
         if (isNew && isConnected.value) {
            // Use worker instead of main thread
            synchronizeWithWorker(app, modelName, dbName, where, disconnectedDate.value)
         }
      })
      const predicate = wherePredicate(where)
      return from(liveQuery(() => db.values.filter(value => !value.__deleted__ && predicate(value)).toArray()))
   }

   async function synchronizeAll() {
      const whereList = await db.whereList.toArray()

      for (const { sortedjson } of whereList) {
         const where = JSON.parse(sortedjson)
         await synchronizeWithWorker(app, modelName, dbName, where, disconnectedDate.value)
      }
   }

   return {
      db, reset,
      create, update, remove,
      findByUID, findWhere,
      getObservable,
      synchronizeAll,
   }
}
```

#### Step 2: Test All Models

1. Clear browser cache and IndexedDB
2. Start dev server: `npm run dev`
3. Sign in and navigate through all tabs
4. Test CRUD operations on all models
5. Test reconnection (toggle network in DevTools)
6. Check for worker errors in Console

## Performance Comparison

### Before (Main Thread)

```
Timeline during sync of 100 user documents:
┌─────────────────────────────────────────┐
│ Main Thread (Blocked - 2.5s)            │
│                                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← UI Frozen
│                                         │
│ [Metadata] [Sync Call] [Fetch 100 IDB] │
└─────────────────────────────────────────┘
```

### After (Worker Thread)

```
Timeline during sync of 100 user documents:
┌─────────────────────────────────────────┐
│ Main Thread (UI Responsive)             │
│                                         │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← UI Interactive
│                                         │
└─────────────────────────────────────────┘
         ▲
         │ postMessage (async)
         ▼
┌─────────────────────────────────────────┐
│ Worker Thread (2.5s)                    │
│                                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                         │
│ [Metadata] [Fetch 100 IDB]              │
└─────────────────────────────────────────┘
```

**Result**: UI remains responsive during sync operations.

## Debugging

### Check Worker Status

```javascript
// In browser console
console.log('Pending messages:', workerBridge.pendingMessages.size)
```

### View Worker Logs

Worker logs are prefixed with `[Worker]`:

```
[Worker] Sync worker initialized
[Worker] synchronize user { user_uid: 'abc123' }
[Worker] applySyncResults user { toAdd: 5, toUpdate: 2, toDelete: 0 }
```

### Common Issues

#### Issue 1: Worker not loading

**Symptoms**: `Failed to initialize worker` error

**Solution**: Check Vite config has worker support:

```javascript
// vite.config.js
export default defineConfig({
   worker: {
      format: 'es',
      plugins: () => []
   },
   // ...
})
```

#### Issue 2: Dexie errors in worker

**Symptoms**: `Dexie is not defined` in worker

**Solution**: Ensure Dexie is imported in `sync.worker.ts`:

```typescript
import Dexie from 'dexie'
```

#### Issue 3: Messages timing out

**Symptoms**: `Worker operation timed out` error

**Solution**: Increase timeout in `workerBridge.ts`:

```typescript
// Change from 30000 to 60000 (60 seconds)
setTimeout(() => {
   if (this.pendingMessages.has(id)) {
      this.pendingMessages.delete(id)
      reject(new Error(`Worker operation timed out: ${type}`))
   }
}, 60000) // Increased timeout
```

#### Issue 4: IndexedDB not shared

**Symptoms**: Changes in main thread not visible in worker (or vice versa)

**Solution**: This is expected! IndexedDB is shared across threads automatically.
Both main thread and worker access the same database. However:
- Main thread uses Dexie instance in `useModel.ts`
- Worker uses separate Dexie instance in `sync.worker.ts`
- Both instances point to same underlying IndexedDB database

If you see stale data, check:
1. Are you using `liveQuery()` for reactive updates?
2. Are pub/sub events (createWithMeta, updateWithMeta) still working?

## Rollback Plan

If worker sync causes issues, rollback is simple:

1. Comment out worker imports in affected files
2. Restore original `synchronize()` calls
3. Restart dev server

```typescript
// Rollback: Comment these lines
// import { synchronizeWithWorker, initWorkerDatabase } from '/src/lib/synchronizeWorker'

// Rollback: Use original
function getObservable(where = {}) {
   addSynchroWhere(where).then((isNew: boolean) => {
      if (isNew && isConnected.value) {
         synchronize(app, modelName, db.values, db.metadata, where, disconnectedDate.value)
      }
   })
   // ...
}
```

## Advanced: Optimizations

### 1. Parallel Sync for Multiple Models

```typescript
// In Home.vue or similar
async function synchronizeAllModels() {
   // Sync all models in parallel using worker
   await Promise.all([
      synchronizeAllUser(),
      synchronizeAllGroup(),
      synchronizeAllUserDocument(),
      // ... etc
   ])
}
```

### 2. Batch Fetches

Modify `synchronizeWorker.ts` to batch fetch operations:

```typescript
// Instead of fetching one-by-one, batch them
const batchSize = 50
for (let i = 0; i < toUpdate.length; i += batchSize) {
   const batch = toUpdate.slice(i, i + batchSize)
   const uids = batch.map(elt => elt.uid)

   // Fetch batch from server (requires server-side support)
   const values = await app.service(modelName).findMany({
      where: { uid: { in: uids } }
   })

   for (const value of values) {
      updatedValues[value.uid] = value
   }
}
```

### 3. SharedWorker for Multiple Tabs

If users open multiple tabs, use `SharedWorker` instead of `Worker`:

```typescript
// In workerBridge.ts
class WorkerBridge {
   private initWorker() {
      // Use SharedWorker for cross-tab sync
      this.worker = new SharedWorker(new URL('../workers/sync.worker.ts', import.meta.url))
      this.worker.port.start()

      this.worker.port.addEventListener('message', (event) => {
         this.handleWorkerMessage(event.data)
      })
   }

   private sendMessage(type: string, payload: any): Promise<any> {
      // Use port.postMessage for SharedWorker
      this.worker.port.postMessage({ type, id, payload })
   }
}
```

## Testing Checklist

Before deploying worker-based sync to production:

- [ ] All models migrate successfully
- [ ] CRUD operations work (create, update, delete)
- [ ] Real-time events work (pub/sub from other clients)
- [ ] Reconnection sync works after network interruption
- [ ] Offline mode works (optimistic updates queue)
- [ ] Performance improvement measured (use Performance tab in DevTools)
- [ ] No console errors related to workers
- [ ] IndexedDB data integrity maintained
- [ ] Multiple tabs work correctly
- [ ] Error handling and rollback work

## Performance Monitoring

Add metrics to track sync performance:

```typescript
// In synchronizeWorker.ts
export async function synchronizeWithWorker(...) {
   const startTime = performance.now()

   try {
      // ... sync logic ...

      const duration = performance.now() - startTime
      console.log(`[SyncWorker] Completed ${modelName} in ${duration.toFixed(2)}ms`)
   } catch (error) {
      const duration = performance.now() - startTime
      console.error(`[SyncWorker] Failed ${modelName} after ${duration.toFixed(2)}ms`, error)
      throw error
   }
}
```

## Support

If you encounter issues during migration:

1. Check browser console for errors
2. Verify Vite worker config
3. Test with network throttling (DevTools → Network → Slow 3G)
4. Compare behavior with original main-thread sync
5. Report issues with:
   - Browser and version
   - Model being synced
   - Number of records
   - Console error messages
   - Network request logs

## Summary

Worker-based sync provides:

✅ Non-blocking UI during large sync operations
✅ Better performance for datasets > 50 records
✅ Parallel processing capability
✅ Same API surface (easy migration)
✅ Backward compatible (can rollback easily)

The migration can be done gradually, one model at a time, with minimal risk.
