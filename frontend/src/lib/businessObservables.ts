import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'

import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useGroupSlot } from '/src/use/useGroupSlot'

const { getObservable: userGroupRelations$ } = useUserGroupRelation()
const { getObservable: userSlotExcuses$, create: createUserSlotExcuse, remove: removeUserSlotExcuse } = useUserSlotExcuse()
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
