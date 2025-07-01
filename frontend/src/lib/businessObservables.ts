import { Observable, from, map, of, merge, combineLatest, throwError } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'

// import { useUser } from '/src/use/useUser'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useGroup } from '/src/use/useGroup'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useGroupSlot } from '/src/use/useGroupSlot'

import { peg$parse as shdlPegParse } from '/src/lib/shdl/shdlPegParser'
import { SHDLError } from '/src/lib/shdl/SHDLError.ts'

// const { getObservable: users$ } = useUser()
const { getObservable: userGroupRelations$ } = useUserGroupRelation()
const { getObservable: groups$ } = useGroup()
const { getObservable: userSlotExcuses$ } = useUserSlotExcuse()
const { getObservable: userDocument$ } = useUserDocument()
const { getObservable: userDocumentEvent$ } = useUserDocumentEvent()
const { getObservable: groupSlots$ } = useGroupSlot()


export function guardCombineLatest(observables) {
   if (observables.length === 0) {
      // If the array is empty, immediately return an Observable that emits an empty array
      return of([])
   } else {
      // Otherwise, proceed with combineLatest
      return combineLatest(observables)
   }
}

export function userGroups$(user_uid: string) {
   return userGroupRelations$({ user_uid }).pipe(
      switchMap(relations =>
         guardCombineLatest(relations.map(relation => groups$({ uid: relation.group_uid }).pipe(map(groups => groups[0]))))
      ),
   )
}

export function userSlots$(user_uid: string) {
   return userGroupRelations$({ user_uid }).pipe(
      switchMap(relations =>
         guardCombineLatest(relations.map(relation => groupSlots$({ group_uid: relation.group_uid })))
      ),
      map(listOfSlotList => listOfSlotList.reduce((accu, slotList) => [...accu, ...slotList], [])),
   )
}

export function userEvents$(user_uid: string) {
   return userDocument$({ user_uid }).pipe(
      switchMap(documentList => 
         guardCombineLatest(
            documentList.map(document =>
               userDocumentEvent$({ document_uid: document.uid })
            )
         )
      ),
      map(listOfList => listOfList.reduce(((accu, list) => [...accu, ...list]), [])),
   )
}

// emit value in 0..20 or -1
export function userGrade$(user_uid: string) {
   return guardCombineLatest([
      userSlots$(user_uid),
      userEvents$(user_uid),
      userSlotExcuses$({ user_uid }),
   ]).pipe(
      map(([slots, events, excuses]) => {
         const now = new Date()
         const excuseSlotUids = excuses.map(excuse => excuse.group_slot_uid)
         const pastUnexcusedSlots = slots.filter(slot => new Date(slot.start) <= now && !excuseSlotUids.includes(slot.uid))
         if (pastUnexcusedSlots.length === 0) {
            return -1
         }
         const activeCount = pastUnexcusedSlots.reduce((accu, slot) => {
            const slotStart = new Date(slot.start)
            const slotEnd = new Date(slot.end)
            if (events.some(event => {
               const eventStart = new Date(event.start)
               return (eventStart >= slotStart && eventStart <= slotEnd)
            })) {
               return accu+1
            } else {
               return accu
            }
         }, 0)
         return Math.floor(activeCount * 20 / pastUnexcusedSlots.length)
      })
   )
}

// Perform the syntactic parsing of an SHDL module `name` and all its submodules
// Emits a list of their structures, the first element being the structure of the root module
export function shdlDocumentParsing$(name, checked=[]) {
   return userDocument$({ name }).pipe(
      // parse root document
      map(documents => {
         const document = documents[0]
         if (!document) {
            throw new Error(`module '${name}' not found`)
         }
         // parse document - may throw an error
         return shdlPegParse(document.text)
      }),
      // extract its structure and its submodule names
      map(structure => {
         const submoduleNames = structure.instances.reduce((accu, instance) =>
            instance.type === 'module_instance' && !accu.includes(instance.name) && !checked.includes(instance.name) ? [instance.name, ...accu] : accu, [])
         return { name, structure, submoduleNames }
      }),
      // recursively parse submodules
      switchMap(({ structure, submoduleNames }) => {
         const observableList = []
         for (const submoduleName of submoduleNames) {
            if (checked.includes(submoduleName) || submoduleName === name) {
               throw new Error(`circularity issue with module '${submoduleName}'`)
            }
            observableList.push(shdlDocumentParsing$(submoduleName, checked))
            checked.push(submoduleName)
         }
         return guardCombineLatest(observableList).pipe(
            map(listOfListOfStructures => listOfListOfStructures.reduce((accu, list) => [...accu, ...list], [])),
            map(structures => [ structure, ...structures ]),
         )
      }),
      catchError(error => {
         // Rethrow a new error to be handled by the subscriber
         throw new SHDLError(error.message, name, error.location)
      })
   )
}
