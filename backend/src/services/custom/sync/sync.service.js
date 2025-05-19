import { Mutex } from "#root/src/lib/utilities.js"

const mutex = new Mutex()


export default function (app) {

   app.createService('sync', {

      // AMÉLIORER : ne pas avoir une exclusion mutuelle globale, mais seulement par model/where
      go: async (modelName, where, cutoffDate, clientMetadataDict) => {
         await mutex.acquire()
         try {
            console.log()
            console.log('>>>>> SYNC', modelName, where, cutoffDate)
            const databaseService = app.service(modelName)
            const prisma = app.get('prisma')
      
            // STEP 1: get existing database `where` values
            const databaseValues = await databaseService.findMany({ where })
         
            const databaseValuesDict = databaseValues.reduce((accu, value) => {
               accu[value.uid] = value
               return accu
            }, {})
            console.log('clientMetadataDict', clientMetadataDict)
            console.log('databaseValuesDict', databaseValuesDict)
         
            // STEP 2: compute intersections between client and database uids
            const onlyDatabaseIds = new Set()
            const onlyClientIds = new Set()
            const databaseAndClientIds = new Set()
         
            for (const uid in databaseValuesDict) {
               if (uid in clientMetadataDict) {
                  databaseAndClientIds.add(uid)
               } else {
                  onlyDatabaseIds.add(uid)
               }
            }
         
            for (const uid in clientMetadataDict) {
               if (uid in databaseValuesDict) {
                  databaseAndClientIds.add(uid)
               } else {
                  onlyClientIds.add(uid)
               }
            }
            console.log('onlyDatabaseIds', onlyDatabaseIds)
            console.log('onlyClientIds', onlyClientIds)
            console.log('databaseAndClientIds', databaseAndClientIds)
         
            // STEP 3: build add/update/delete sets
            const addDatabase = []
            const updateDatabase = []
            const deleteDatabase = []
         
            const addClient = []
            const updateClient = []
            const deleteClient = []
         
            for (const uid of onlyDatabaseIds) {
               const databaseValue = databaseValuesDict[uid]
               const databaseMetaData = await prisma.metadata.findUnique({ where: { uid }})
               addClient.push([databaseValue, databaseMetaData])
            }
         
            for (const uid of onlyClientIds) {
               const clientMetaData = clientMetadataDict[uid]
               if (clientMetaData.deleted_at) {
                  deleteClient.push([uid, clientMetaData.deleted_at])
               } else if (new Date(clientMetaData.created_at) > cutoffDate) {
                  addDatabase.push(clientMetaData)
               } else {
                  // ???
               }
            }
         
            for (const uid of databaseAndClientIds) {
               const databaseValue = databaseValuesDict[uid]
               const clientMetaData = clientMetadataDict[uid]
               if (clientMetaData.deleted_at) {
                  deleteDatabase.push(uid)
                  deleteClient.push([uid, clientMetaData.deleted_at])
               } else {
                  const databaseMetaData = await prisma.metadata.findUnique({ where: { uid }})
                  const clientUpdatedAt = new Date(clientMetaData.updated_at || clientMetaData.created_at)
                  const databaseUpdatedAt = new Date(databaseMetaData.updated_at || databaseMetaData.created_at)
                  const dateDifference = clientUpdatedAt - databaseUpdatedAt
                  // console.log('databaseMetaData', databaseMetaData, 'clientMetaData', clientMetaData, 'dateDifference', dateDifference)
                  if (dateDifference > 0) {
                     updateDatabase.push(clientMetaData)
                  } else if (dateDifference < 0) {
                     updateClient.push(databaseValue)
                  }
               }
            }
            console.log('addDatabase', addDatabase)
            console.log('deleteDatabase', deleteDatabase)
            console.log('updateDatabase', updateDatabase)
         
            console.log('addClient', addClient)
            console.log('deleteClient', deleteClient)
            console.log('updateClient', updateClient)
         
            // STEP4: execute database deletions
            for (const uid of deleteDatabase) {
               const clientMetaData = clientMetadataDict[uid]
               console.log('---delete', uid, clientMetaData)
               await databaseService.deleteWithMeta(uid, clientMetaData.deleted_at)
            }
         
            // STEP5: return to client the changes to perform on its cache, and create/update to perform on database with full data
            // database creations & updates are done later by the client with complete data (this function only has client values's meta-data)
            return {
               toAdd: addClient,
               toUpdate: updateClient,
               toDelete: deleteClient,

               addDatabase,
               updateDatabase,
            }
         } catch(err) {
            console.log('*** err sync', err)
         } finally {
            mutex.release()
         }
      },
   })

}
