import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'

import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useGroupSlot } from '/src/use/useGroupSlot'

const { getObservable: userGroupRelations$ } = useUserGroupRelation()
const { getObservable: userSlotExcuses$ } = useUserSlotExcuse()
const { getObservable: userDocument$ } = useUserDocument()
const { getObservable: userDocumentEvent$ } = useUserDocumentEvent()
const { getObservable: groupSlots$ } = useGroupSlot()

import { guardCombineLatest } from '/src/lib/utilities'


export function userSlots$(user_uid: string) {
   return userGroupRelations$({ user_uid }).pipe(
      switchMap(relations =>
         guardCombineLatest(relations.map(relation => groupSlots$({ group_uid: relation.group_uid })))
      ),
      map(listOfSlotList => listOfSlotList.reduce((accu, list) => [...accu, ...list]), []),
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
      map(listOfList => listOfList.reduce((accu, list) => [...accu, ...list]), []),
   )
}

// emit value in 0..20 or undefined
export function userGrade$(user_uid: string) {
   return guardCombineLatest([
      userSlots$(user_uid),
      userEvents$(user_uid),
      userSlotExcuses$({ user_uid }),
   ]).pipe(
      tap(x => console.log('grade', x)),
      map(([slots, events, excuses]) => {
         const now = new Date()
         const excuseSlotUids = excuses.map(excuse => excuse.group_slot_uid)
         const pastUnexcusedSlots = slots.filter(slot => new Date(slot.start) <= now && !excuseSlotUids.includes(slot.uid))
         if (pastUnexcusedSlots.length === 0) {
            return
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
