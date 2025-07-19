<template>
   {{ testAndSlotsList }}
   <v-card>
      <v-form>
         <v-container>
            <v-row>
               <v-col cols="12" md="6">
                  <v-text-field
                     label="Nom"
                     :modelValue="group?.name"
                     @input="(e) => onFieldInputDebounced('name', e.target.value)"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
            </v-row>
         </v-container>
      </v-form>
   </v-card>

   <GroupSlots :group_uid="group_uid"></GroupSlots>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import { guardCombineLatest } from '/src/lib/businessObservables'

import { useGroup } from '/src/use/useGroup'
import { useSHDLTest } from '/src/use/useSHDLTest'
import { useGroupSlotSHDLTestRelation } from '/src/use/useGroupSlotSHDLTestRelation'
import { displaySnackbar } from '/src/use/useSnackbar'

import GroupSlots from '/src/views/groups/GroupSlots.vue'

const { getObservable: groups$, update: updateGroup } = useGroup()
const { getObservable: shdlTests$ } = useSHDLTest()
const { getObservable: groupslotShdltestRelations$ } = useGroupSlotSHDLTestRelation()


const props = defineProps({
   group_uid: {
      type: String,
   },
})

const group = ref()

let groupSubscription

function group$(group_uid) {
   return groups$({ uid: group_uid }).pipe(
      map(groups => groups.length > 0 ? groups[0] : null)
   )
}

onUnmounted(() => {
   groupSubscription && groupSubscription.unsubscribe()
})

watch(() => props.group_uid, async (group_uid) => {
   groupSubscription = group$(group_uid).subscribe(grp => {
      group.value = grp
   })
}, { immediate: true })


//////////////////////        TEXT FIELD EDITING        //////////////////////

const onFieldInput = async (field, value) => {
   try {
      await updateGroup(props.group_uid, { [field]: value })
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la sauvegarde...", color: 'error', timeout: 4000 })
   }
}
const onFieldInputDebounced = useDebounceFn(onFieldInput, 500)


//////////////////////        RELATION GROUP_SLOT <-> SHDL_TEST        //////////////////////

const testAndSlots$ = shdlTests$({}).pipe(
   switchMap(tests => 
      guardCombineLatest(
         tests.map(test =>
            groupslotShdltestRelations$({ shdl_test_uid: test.uid }).pipe(
               switchMap(relations =>
                  guardCombineLatest(relations.map(relation => shdlTests$({ uid: relation.group_slot_uid }).pipe(map(groupSlots => groupSlots[0]))))
               ),
               map(groupSlots => ({ test, groupSlots }))
            )
         )
      )
   ),
)
const testAndSlotsList = useObservable(testAndSlots$)

</script>
