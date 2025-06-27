import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'

// import { useUser } from '/src/use/useUser'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useGroup } from '/src/use/useGroup'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useGroupSlot } from '/src/use/useGroupSlot'

import { peg$parse as shdlPegParse } from '/src/lib/shdl/shdlPegParser'

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

// this observer finally emits the syntactic structure of a root shdl document `document_uid` and all its submodule documents,
// as they become available
export function shdlDocumentParsing0$(name) {
   return userDocument$({ name }).pipe(
      map(documents => {
         const document = documents[0]
         try {
            const structure = shdlPegParse(document.text)
            const submoduleNames = structure.instances.reduce((accu, instance) =>
               instance.type === 'module_instance' && !accu.includes(instance.name) ? [instance.name, ...accu] : accu, [])
            console.log('submoduleNames', submoduleNames)
            // switchMap(submoduleNames => 
            //    guardCombineLatest(
            //       submoduleNames.map(submoduleName =>
            //          userDocumentEvent$({ document_uid: document.uid })
            //       )
            //    )
            // ),
            const substructures = []
            return [ structure, ...substructures]
         } catch(err) {
            return err
         }
      })
   )
}

export function shdlDocumentParsing$(name) {
   console.log('running', name)
   return userDocument$({ name }).pipe(
      map(documents => {
         const document = documents[0]
         return shdlPegParse(document.text)
      }),
      map(structure => {
         const submoduleNames = structure.instances.reduce((accu, instance) =>
            instance.type === 'module_instance' && !accu.includes(instance.name) ? [instance.name, ...accu] : accu, [])
         console.log('submoduleNames', submoduleNames)
         return { name, structure, submoduleNames }
      }),
      map(({ name, structure, submoduleNames }) => {
         return ({ name, structure, submoduleNames })
      }),
      switchMap(({ structure, submoduleNames }) => {
         console.log('name2', name)
         return guardCombineLatest(
            submoduleNames.map(name2 =>
               shdlDocumentParsing$(name2)
            )
         )
      })
   )
}

         // switchMap(x.submoduleNames => 
         //    guardCombineLatest(
         //       submoduleNames.map(name =>
         //          shdlDocumentParsing$({ name })
         //       )
         //    )
