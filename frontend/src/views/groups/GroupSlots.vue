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
               <tr v-for="groupSlot in slotList" :key="groupSlot.uid">
                  <td>{{ groupSlot.name }}</td>
                  <td>{{ format(groupSlot.start, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
                  <td>{{ format(groupSlot.end, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
                  <td><v-btn color="grey-lighten-1" icon="mdi-pencil" variant="text" @click="editSlot(groupSlot)"></v-btn></td>
                  <td><v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteSlot(groupSlot)"></v-btn></td>
               </tr>
            </tbody>
         </v-table>
      </div>
   </v-card>

   <v-dialog persistent v-model="addOrEditSlotDialog" max-width="400">
      <v-form v-model="valid" lazy-validation>
         <v-card :title="edit ? 'Éditer créneau horaire' : 'Nouveau créneau horaire'">
            <v-card-text>
               <v-row dense>
                  <v-col cols="12" md="12">
                     <v-text-field
                        label="Nom"
                        v-model="slotData.name"
                        :rules="nameRules"
                     ></v-text-field>
                     <v-row dense>
                        <v-text-field
                           type="date"
                           label="date début"
                           v-model="slotData.startdate"
                           :rules="dateRules"
                        ></v-text-field>
                        <v-text-field
                           type="time"
                           label="heure"
                           v-model="slotData.starttime"
                           :rules="timeRules"
                        ></v-text-field>
                     </v-row>
                     <v-row dense>
                        <v-text-field
                           type="date"
                           label="date fin"
                           v-model="slotData.enddate"
                           :rules="dateRules"
                        ></v-text-field>
                        <v-text-field
                           type="time"
                           label="heure"
                           v-model="slotData.endtime"
                           :rules="timeRules"
                        ></v-text-field>
                     </v-row>
                     <v-row dense>
                        <v-select
                           multiple
                           label="Tests durant la période"
                           :items="shdlTestList"
                           :item-value="test => test.uid"
                           :item-title="test => test.name"
                           v-model="selectedTestUIDs"
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
import { useObservable } from '@vueuse/rxjs'

import { useGroupSlot } from '/src/use/useGroupSlot'
import { useSHDLTest } from '/src/use/useSHDLTest'
import { useGroupSlotSHDLTestRelation } from '/src/use/useGroupSlotSHDLTestRelation'

import { displaySnackbar } from '/src/use/useSnackbar'

const { getObservable: groupSlots$, create: createGroupSlot, update: updateGroupSlot, remove: removeGroupSlot } = useGroupSlot()
const { getObservable: shdlTests$ } = useSHDLTest()
const { getObservable: groupslotShdltestRelations$, groupDifference, create: createGroupSlotSHDLTestRelation, remove: removeGroupSlotSHDLTestRelation } = useGroupSlotSHDLTestRelation()


const props = defineProps({
   signedinUid: {
      type: String,
   },
   group_uid: {
      type: String,
   },
})

const shdlTestList = useObservable(shdlTests$())
const slotList = ref([])

const selectedTestUIDs = ref([])

let groupSubscription
let slotSubscription

onUnmounted(() => {
   if (groupSubscription) groupSubscription.unsubscribe()
   if (slotSubscription) slotSubscription.unsubscribe()
})

watch(() => props.group_uid, async (group_uid) => {
   if (groupSubscription) groupSubscription.unsubscribe()
   groupSubscription = groupSlots$({ group_uid }).subscribe(slots => {
      slotList.value = slots.toSorted((u1, u2) => (u1.start > u2.start) ? 1 : (u1.start < u2.start) ? -1 : 0)
   })
}, { immediate: true })

const addOrEditSlotDialog = ref(false)
const edit = ref(false)
const slotData = ref({})
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
   slotData.value = {}
   groupSlotToEdit.value = null // will force selectedTestUIDs to [], see watch/groupSlotToEditUid
   edit.value = false
   addOrEditSlotDialog.value = true
}

// when a new slot is edited, start observing its associated tests
const groupSlotToEdit = ref()
watch(groupSlotToEdit, (groupSlot) => {
   if (slotSubscription) slotSubscription.unsubscribe()
   if (groupSlot === null) {
      selectedTestUIDs.value = []
   } else {
      slotSubscription = groupslotShdltestRelations$({ group_slot_uid: groupSlot.uid }).subscribe((relationList) => {
         selectedTestUIDs.value = relationList.map(relation => relation.shdl_test_uid)
      })
   }
})

async function editSlot(groupSlot) {
   groupSlotToEdit.value = groupSlot // start observation of tests for this slot (see watch/groupSlotToEditUid)

   slotData.value = {
      uid: groupSlot.uid,
      group_uid: groupSlot.group_uid,
      name: groupSlot.name,
      startdate: groupSlot.start.substring(0, 10),
      starttime: new Date(groupSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      enddate: groupSlot.end.substring(0, 10),
      endtime: new Date(groupSlot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
   }
   edit.value = true
   addOrEditSlotDialog.value = true
}

const createSlot = async () => {
   // create group slot
   const createdGroupSlot = await createGroupSlot({
      group_uid: props.group_uid,
      name: slotData.value.name,
      start: new Date(slotData.value.startdate + 'T' + slotData.value.starttime),
      end: new Date(slotData.value.enddate + 'T' + slotData.value.endtime),
   })
   // add group_slot <-> shdl_test relations
   for (const shdl_test_uid of selectedTestUIDs.value) {
      await createGroupSlotSHDLTestRelation({ group_slot_uid: createdGroupSlot.uid, shdl_test_uid })
   }
}

const updateSlot = async () => {
   console.log('update', slotData.value)

   // update group_slot <-> shdl_test relations
   const [toAddTestUIDs, toRemoveRelationUIDs] = await groupDifference(slotData.value.uid, selectedTestUIDs.value)
   for (const shdl_test_uid of toAddTestUIDs) {
      await createGroupSlotSHDLTestRelation({ group_slot_uid: slotData.value.uid, shdl_test_uid })
   }
   for (const relation_uid of toRemoveRelationUIDs) {
      await removeGroupSlotSHDLTestRelation(relation_uid)
   }

   // update group slot
   await updateGroupSlot(slotData.value.uid, {
      group_uid: slotData.value.group_uid,
      name: slotData.value.name,
      start: new Date(slotData.value.startdate + 'T' + slotData.value.starttime),
      end: new Date(slotData.value.enddate + 'T' + slotData.value.endtime),
   })
}

const deleteSlot = async (groupSlot) => {
   if (window.confirm(`Supprimer le slot ${groupSlot.name} ?`)) {
      try {
         await removeGroupSlot(groupSlot.uid)
         displaySnackbar({ text: "Suppression effectuée avec succès !", color: 'success', timeout: 2000 })
      } catch(err) {
         displaySnackbar({ text: "Erreur lors de la suppression...", color: 'error', timeout: 4000 })
      }
   }
}
</script>
