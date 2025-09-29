import { Observable, from, map, of, merge, combineLatest, throwError } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError, filter } from 'rxjs/operators'

import { useUser } from '/src/use/useUser'
import { useUserTabRelation } from '/src/use/useUserTabRelation'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useGroup } from '/src/use/useGroup'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useGroupSlot } from '/src/use/useGroupSlot'
import { useSHDLTest } from '/src/use/useSHDLTest'
import { useGroupSlotSHDLTestRelation } from '/src/use/useGroupSlotSHDLTestRelation'
import { useUserSHDLTestRelation } from '/src/use/useUserSHDLTestRelation'

import { peg$parse as shdlPegParse } from '/src/lib/shdl/shdlPegParser'
import { SHDLError } from '/src/lib/shdl/SHDLError.ts'

const { getObservable: users$ } = useUser()
const { getObservable: userTabRelations$ } = useUserTabRelation()
const { getObservable: userGroupRelations$ } = useUserGroupRelation()
const { getObservable: groups$ } = useGroup()
const { getObservable: userSlotExcuses$ } = useUserSlotExcuse()
const { getObservable: userDocument$ } = useUserDocument()
const { getObservable: userDocumentEvent$ } = useUserDocumentEvent()
const { getObservable: groupSlots$ } = useGroupSlot()
const { getObservable: shdlTests$ } = useSHDLTest()
const { getObservable: groupSlotSHDLTestRelation$ } = useGroupSlotSHDLTestRelation()
const { getObservable: userSHDLTestRelations$ } = useUserSHDLTestRelation()


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

export function isTeacher$(user_uid: string) {
   return userTabRelations$({ user_uid }).pipe(
      map(relations => relations.some(relation => relation.tab === 'followup'))
   )
}

export function teachers$() {
   return userTabRelations$({ tab: 'followup' }).pipe(
      map(relations => relations.map(relation => relation.user_uid)),
      switchMap(userUidList =>
         guardCombineLatest(userUidList.map(uid => users$({ uid })))
      ),
      map(listOfList => listOfList.reduce(((accu, list) => [...accu, ...list]), [])),
   )
}

export function students$() {
   return users$({}).pipe(
      switchMap(users =>
         guardCombineLatest(users.map(user => userTabRelations$({ user_uid: user.uid })))
      ),
      map(listOfList => listOfList.filter(relations => !relations.some(relation => relation.tab === 'followup'))),
      map(listOfList => listOfList.reduce(((accu, list) => [...accu, ...list]), [])),
      switchMap(relations =>
         guardCombineLatest(relations.map(relation => users$({ uid: relation.user_uid })))
      ),
      map(listOfList => listOfList.reduce(((accu, list) => [...accu, ...list]), [])),
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

// emit the list of SHDL tests uids for this user, looking into all group slots he/she is member of
export function userSHDLTests$(user_uid: string) {
   return userSlots$(user_uid).pipe(
      switchMap(slotList =>
         guardCombineLatest(
            slotList.map(slot => groupSlotSHDLTestRelation$({ group_slot_uid: slot.uid }))
         )
      ),
      map(listOfList => [...new Set(listOfList.reduce(((accu, list) => [...accu, ...list]), []).map(relation => relation.shdl_test_uid))]),
      switchMap(testUidList =>
         guardCombineLatest(testUidList.map(uid => shdlTests$({ uid }).pipe(map(tests => tests[0]))))
      ),
   )
}

export function userGroupSlotSHDLTestRelation$(user_uid: string) {
   return userSlots$(user_uid).pipe(
      switchMap(slotList =>
         guardCombineLatest(
            slotList.map(slot => groupSlotSHDLTestRelation$({ group_slot_uid: slot.uid }))
         )
      ),
      map(listOfList => [...new Set(listOfList.reduce(((accu, list) => [...accu, ...list]), []))]),
   )
}

export function userSHDLTestsRelations$(user_uid: string) {
   return userSHDLTests$(user_uid).pipe(
      switchMap(testList =>
         guardCombineLatest(
            testList.map(test =>
               userSHDLTestRelations$({ user_uid, shdl_test_uid: test.uid })
            )
         )
      ),
      map(listOfList => [...new Set(listOfList.reduce(((accu, list) => [...accu, ...list]), []))]),
   )
}

// emit value in 0..20
export function userGrade$(user_uid: string, now) {
   return guardCombineLatest([
      userAttendanceGrade$(user_uid, now),
      userTestGrade$(user_uid, now),
   ]).pipe(
      map(([attendanceGrade, testGrade]) => {
         const percentage = (attendanceGrade + testGrade) / 2
         return Math.round(percentage * 20 / 100)
      })
   )
}

// emit value in 0..100
export function userTestGrade$(user_uid: string) {
   return guardCombineLatest([
      userSHDLTests$(user_uid),
      userSHDLTestsRelations$(user_uid),
   ]).pipe(
      map(([tests, testRelations]) => {
         let totalWeight = 0
         let testsWeight = 0
         for (const test of tests) {
            const testRelation = testRelations.find(testRelation => testRelation.shdl_test_uid === test.uid)
            if (testRelation) {
               testsWeight += test.weight * testRelation.evaluation
            }
            totalWeight += test.weight
         }
         return Math.round(testsWeight / totalWeight)
      })
   )
}

// emit value in 0..100
export function userAttendanceGrade$(user_uid: string, now) {
   return guardCombineLatest([
      userSlots$(user_uid),
      userEvents$(user_uid),
      userSlotExcuses$({ user_uid }),
   ]).pipe(
      map(([slots, events, excuses]) => {
         const excuseSlotUids = excuses.map(excuse => excuse.group_slot_uid)
         const pastUnexcusedSlots = slots.filter(slot => new Date(slot.start) <= now && !excuseSlotUids.includes(slot.uid))
         if (pastUnexcusedSlots.length === 0) {
            return 100 // max grade by vacuity
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
         return Math.floor(activeCount * 100 / pastUnexcusedSlots.length)
      })
   )
}

// Perform the syntactic parsing of an SHDL module `name` and all its submodules
// Emit a list of their structures, the first element being the structure of the root module
export function shdlDocumentParsing$(user_uid, name, checked=[]) {
   return userDocument$({ user_uid, name }).pipe(
      // parse root document
      map(documents => {
         const document = documents[0]
         if (!document) {
            throw new SHDLError(`module '${name}' not found`, null, name, null)
         }
         // parse document - may throw an error
         try {
            const structure = shdlPegParse(document.text)
            return { document, structure }
         } catch(err) {
            throw new SHDLError(err.message, document.uid, name, err.location)
         }
      }),
      // extract its structure and its submodule names
      map(({ document, structure }) => {
         const submoduleNames = structure.instances.reduce((accu, instance) =>
            instance.type === 'module_instance' && !accu.includes(instance.name) && !checked.includes(instance.name) ? [instance.name, ...accu] : accu, [])
         return { name, document, structure, submoduleNames }
      }),
      // recursively parse submodules
      switchMap(({ document, structure, submoduleNames }) => {
         const observableList = []
         for (const submoduleName of submoduleNames) {
            if (checked.includes(submoduleName) || submoduleName === name) {
               throw new SHDLError(`circularity issue with module '${submoduleName}'`, document.uid, submoduleName, null)
            }
            try {
               observableList.push(shdlDocumentParsing$(user_uid, submoduleName, checked))
               checked.push(submoduleName)
            } catch(err) {
               throw new SHDLError(err.message, document.uid, submoduleName, err.location)
            }
         }
         return guardCombineLatest(observableList).pipe(
            map(listOfListOfStructures => listOfListOfStructures.reduce((accu, list) => [...accu, ...list], [])),
            map(structures => [ structure, ...structures ]),
         )
      }),
      catchError(error => {
         // re-throw error
         throw new SHDLError(error.message, error.documentUID, error.moduleName ?? name, error.location)
      })
   )
}
