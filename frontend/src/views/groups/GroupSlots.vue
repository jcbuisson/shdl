<template>
   <v-card class="d-flex flex-column fill-height">
      <v-toolbar color="green-darken-3" density="compact">
         <v-btn icon="mdi-plus" variant="text" @click="addSlot"></v-btn>
         Créneaux horaires
      </v-toolbar>
   
      <!-- Fills remaining vertical space -->
      <div class="d-flex flex-column flex-grow-1 overflow-auto">
         <v-table>
            <thead>
               <tr>
                  <th class="text-left">Nom</th>
                  <th class="text-left">Début</th>
                  <th class="text-left">Fin</th>
                  <th class="text-left">Éditer</th>
                  <th class="text-left">Supprimer</th>
               </tr>
            </thead>
            <tbody>
               <tr v-for="slot in slotList" :key="slot.uid">
                  <td>{{ slot.name }}</td>
                  <td>{{ format(slot.start, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
                  <td>{{ format(slot.end, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
                  <td><v-btn color="grey-lighten-1" icon="mdi-pencil" variant="text" @click="editSlot(slot)"></v-btn></td>
                  <td><v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteSlot(slot)"></v-btn></td>
               </tr>
            </tbody>
         </v-table>
      </div>
   </v-card>

   <v-dialog persistent v-model="addOrEditSlotDialog" max-width="400">
      {{ testAndSlotsList }}
      <v-form v-model="valid" lazy-validation>
         <v-card :title="edit ? 'Éditer créneau horaire' : 'Nouveau créneau horaire'">
            <v-card-text>
               <v-row dense>
                  <v-col cols="12" md="12">
                     <v-text-field
                        label="Nom"
                        v-model="data.name"
                        :rules="nameRules"
                     ></v-text-field>
                     <v-row dense>
                        <v-text-field
                           type="date"
                           label="date début"
                           v-model="data.startdate"
                           :rules="dateRules"
                        ></v-text-field>
                        <v-text-field
                           type="time"
                           label="heure"
                           v-model="data.starttime"
                           :rules="timeRules"
                        ></v-text-field>
                     </v-row>
                     <v-row dense>
                        <v-text-field
                           type="date"
                           label="date fin"
                           v-model="data.enddate"
                           :rules="dateRules"
                        ></v-text-field>
                        <v-text-field
                           type="time"
                           label="heure"
                           v-model="data.endtime"
                           :rules="timeRules"
                        ></v-text-field>
                     </v-row>
                     <v-row dense>
                        <v-select
                           multiple
                           label="Tests durant la période"
                           :items="testAndSlotsList"
                           :item-value="ts => ts"
                           :item-title="ts => ts.test.name"
                        ></v-select>
                     </v-row>
                  </v-col>
               </v-row>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions>
               <v-spacer></v-spacer>
               <v-btn text="Annuler" variant="plain" @click="addOrEditSlotDialog = false"></v-btn>
               <v-btn v-if="edit" :disabled="!valid" color="primary" text="Modifier" variant="tonal" @click="addOrEditSlotDialog = false; updateSlot()"></v-btn>
               <v-btn v-else :disabled="!valid" color="primary" text="Créer" variant="tonal" @click="addOrEditSlotDialog = false; createSlot()"></v-btn>
            </v-card-actions>
         </v-card>
      </v-form>
   </v-dialog>

</template>

<script setup>
import { ref, onUnmounted, watch } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import { useGroupSlot } from '/src/use/useGroupSlot'
import { useSHDLTest } from '/src/use/useSHDLTest'
import { useGroupSlotSHDLTestRelation } from '/src/use/useGroupSlotSHDLTestRelation'

import { guardCombineLatest } from '/src/lib/businessObservables'

import { displaySnackbar } from '/src/use/useSnackbar'

const { getObservable: groupSlots$, create: createGroupSlot, update: updateGroupSlot, remove: removeGroupSlot } = useGroupSlot()
const { getObservable: shdlTests$ } = useSHDLTest()
const { getObservable: groupslotShdltestRelations$ } = useGroupSlotSHDLTestRelation()


const props = defineProps({
   group_uid: {
      type: String,
   },
})

const slotList = ref([])

let subscription

watch(() => props.group_uid, async (group_uid) => {
   if (subscription) subscription.unsubscribe()
   subscription = groupSlots$({ group_uid }).subscribe(slots => {
      slotList.value = slots.toSorted((u1, u2) => (u1.start > u2.start) ? 1 : (u1.start < u2.start) ? -1 : 0)
   })
}, { immediate: true })

onUnmounted(() => {
   if (subscription) subscription.unsubscribe()
})

const addOrEditSlotDialog = ref(false)
const edit = ref(false)
const data = ref({})
const valid = ref()

const nameRules = [
   (v) => !!v || "Le nom est obligatoire",
]
const dateRules = [
   (v) => !!v || "La date est obligatoire",
]
const timeRules = [
   (v) => !!v || "L'heure est obligatoire",
]

async function addSlot() {
   data.value = {}
   edit.value = false
   addOrEditSlotDialog.value = true
}

async function editSlot(slot) {
   console.log('slot', slot)
   data.value = {
      uid: slot.uid,
      group_uid: slot.group_uid,
      name: slot.name,
      startdate: slot.start.substring(0, 10),
      starttime: new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      enddate: slot.end.substring(0, 10),
      endtime: new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
   }
   edit.value = true
   addOrEditSlotDialog.value = true
}

const createSlot = async () => {
   const createdGroupSlot = await createGroupSlot({
      group_uid: props.group_uid,
      name: data.value.name,
      start: new Date(data.value.startdate + 'T' + data.value.starttime),
      end: new Date(data.value.enddate + 'T' + data.value.endtime),
   })
   console.log('createdGroupSlot', createdGroupSlot)
}

const updateSlot = async () => {
   console.log('update', data.value)
   await updateGroupSlot(data.value.uid, {
      group_uid: data.value.group_uid,
      name: data.value.name,
      start: new Date(data.value.startdate + 'T' + data.value.starttime),
      end: new Date(data.value.enddate + 'T' + data.value.endtime),
   })
}

const deleteSlot = async (slot) => {
   if (window.confirm(`Supprimer le slot ${slot.name} ?`)) {
      try {
         await removeGroupSlot(slot.uid)
         displaySnackbar({ text: "Suppression effectuée avec succès !", color: 'success', timeout: 2000 })
      } catch(err) {
         displaySnackbar({ text: "Erreur lors de la suppression...", color: 'error', timeout: 4000 })
      }
   }
}

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