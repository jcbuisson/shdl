<template>
   <v-card>
      <v-toolbar color="green-darken-3" density="compact">
         <v-btn icon="mdi-plus" variant="text" @click="addSlot"></v-btn>
         Créneaux horaires
      </v-toolbar>
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
               <td>{{ format(new Date(groupSlot.start), "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
               <td>{{ format(new Date(groupSlot.end), "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
               <td><v-btn color="grey-lighten-1" icon="mdi-pencil" variant="text" @click="editSlot(groupSlot)"></v-btn></td>
               <td><v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteSlot(groupSlot)"></v-btn></td>
            </tr>
         </tbody>
      </v-table>

      <v-toolbar color="green-darken-3 mt-4" density="compact">
         <v-btn icon="mdi-plus" variant="text" @click="addMember"></v-btn>
         Membres du groupe
      </v-toolbar>
      <v-table>
         <thead>
            <tr>
               <th class="text-left">Nom</th>
               <th class="text-left">Prénom</th>
               <th class="text-left">Supprimer</th>
            </tr>
         </thead>
         <tbody>
            <tr v-for="member in groupMemberList" :key="member.uid">
               <td>{{ member.lastname }}</td>
               <td>{{ member.firstname }}</td>
               <td><v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteMember(member)"></v-btn></td>
            </tr>
         </tbody>
      </v-table>
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
                           :items="sortedTestList"
                           :item-value="test => test.uid"
                           :item-title="test => test.name"
                           v-model="selectedTestUIDs"
                           :loading="slotTestsLoading"
                           :disabled="slotTestsLoading || savingSlot"
                        ></v-select>
                     </v-row>
                  </v-col>
               </v-row>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions>
               <v-spacer></v-spacer>
               <v-btn text="Annuler" variant="plain" :disabled="savingSlot" @click="closeSlotDialog"></v-btn>
               <v-btn v-if="edit" :disabled="!valid || slotTestsLoading" :loading="savingSlot" color="primary" text="Modifier" variant="tonal" @click="updateSlot"></v-btn>
               <v-btn v-else :disabled="!valid" :loading="savingSlot" color="primary" text="Créer" variant="tonal" @click="createSlot"></v-btn>
            </v-card-actions>
         </v-card>
      </v-form>
   </v-dialog>

</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useObservable } from '@vueuse/rxjs'

import useExpressXClient from '/src/use/useExpressXClient';

import { useGroupSlot } from '/src/use/useGroupSlot'
import { useSHDLTest } from '/src/use/useSHDLTest'
import { useGroupSlotSHDLTestRelation } from '/src/use/useGroupSlotSHDLTestRelation'
import { useBusinessObservables } from '/src/use/useBusinessObservables'
import { useAuthentication } from '/src/use/useAuthentication'

import { displaySnackbar } from '/src/use/useSnackbar'

const { app } = useExpressXClient();
const { getObservable: groupSlots$, create: createGroupSlot, update: updateGroupSlot, remove: removeGroupSlot } = useGroupSlot(app)
const { getObservable: shdlTests$ } = useSHDLTest(app)
const { getObservable: groupSlotSHDLTestRelations$, create: createGroupSlotSHDLTestRelation, remove: removeGroupSlotSHDLTestRelation } = useGroupSlotSHDLTestRelation(app)
const { groupMembers$ } = useBusinessObservables(app)
const { refreshExpiration } = useAuthentication(app)


const props = defineProps({
   signedinUid: {
      type: String,
   },
   group_uid: {
      type: String,
   },
})

const shdlTestList = useObservable(shdlTests$());
const groupSlotSHDLTestRelationList = useObservable(groupSlotSHDLTestRelations$({}))
const sortedTestList = computed(() => shdlTestList.value
   ? [...shdlTestList.value].sort((test1, test2) =>
      test1.name.localeCompare(test2.name, undefined, { sensitivity: 'base' })
   )
   : []
)
const slotList = ref([]);
const groupMemberList = ref([]);

const selectedTestUIDs = ref([]);

let groupSubscription;
let groupMembersSubscription;;

onUnmounted(() => {
   if (groupSubscription) groupSubscription.unsubscribe();
   if (groupMembersSubscription) groupMembersSubscription.unsubscribe();
})

watch(() => props.group_uid, async (group_uid) => {
   if (groupSubscription) groupSubscription.unsubscribe();
   groupSubscription = groupSlots$({ group_uid }).subscribe(slots => {
      slotList.value = slots.toSorted((u1, u2) => (u1.start > u2.start) ? 1 : (u1.start < u2.start) ? -1 : 0);
   })

   if (groupMembersSubscription) groupMembersSubscription.unsubscribe();
   groupMembersSubscription = groupMembers$({ group_uid }).subscribe(groupMembers => {
      groupMemberList.value = groupMembers;
   })

}, { immediate: true })

const addOrEditSlotDialog = ref(false)
const edit = ref(false)
const slotData = ref({})
const valid = ref()
const slotTestsLoading = ref(false)
const savingSlot = ref(false)
let slotEditRequest = 0

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
   slotEditRequest++
   slotData.value = {}
   selectedTestUIDs.value = []
   slotTestsLoading.value = false
   edit.value = false
   addOrEditSlotDialog.value = true
}

async function editSlot(groupSlot) {
   slotEditRequest++
   slotData.value = {
      uid: groupSlot.uid,
      group_uid: groupSlot.group_uid,
      name: groupSlot.name,
      startdate: groupSlot.start.substring(0, 10),
      starttime: new Date(groupSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      enddate: groupSlot.end.substring(0, 10),
      endtime: new Date(groupSlot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
   }
   selectedTestUIDs.value = relationsForSlot(groupSlot.uid).map(relation => relation.test_uid)
   slotTestsLoading.value = !groupSlotSHDLTestRelationList.value
   edit.value = true
   addOrEditSlotDialog.value = true
}

watch(groupSlotSHDLTestRelationList, relations => {
   if (!addOrEditSlotDialog.value || !edit.value || !slotTestsLoading.value || !relations) return
   selectedTestUIDs.value = relationsForSlot(slotData.value.uid).map(relation => relation.test_uid)
   slotTestsLoading.value = false
})

function relationsForSlot(groupSlotUid) {
   return (groupSlotSHDLTestRelationList.value || [])
      .filter(relation => relation.group_slot_uid === groupSlotUid)
}

const createSlot = async () => {
   savingSlot.value = true
   try {
      await refreshExpiration()
      const createdGroupSlot = await createGroupSlot({
         group_uid: props.group_uid,
         name: slotData.value.name,
         start: new Date(slotData.value.startdate + 'T' + slotData.value.starttime),
         end: new Date(slotData.value.enddate + 'T' + slotData.value.endtime),
      })
      await Promise.all(selectedTestUIDs.value.map(test_uid =>
         createGroupSlotSHDLTestRelation({ group_slot_uid: createdGroupSlot.uid, test_uid })
      ))
      closeSlotDialog()
      displaySnackbar({ text: "Création effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch (err) {
      displaySnackbar({ text: "Erreur lors de la création du créneau.", color: 'error', timeout: 4000 })
   } finally {
      savingSlot.value = false
   }
}

const updateSlot = async () => {
   savingSlot.value = true
   try {
      await refreshExpiration()
      const currentRelations = relationsForSlot(slotData.value.uid)
      const toAddTestUIDs = selectedTestUIDs.value.filter(testUid =>
         !currentRelations.some(relation => relation.test_uid === testUid)
      )
      const toRemoveRelationUIDs = currentRelations
         .filter(relation => !selectedTestUIDs.value.includes(relation.test_uid))
         .map(relation => relation.uid)
      await Promise.all([
         ...toAddTestUIDs.map(test_uid =>
            createGroupSlotSHDLTestRelation({ group_slot_uid: slotData.value.uid, test_uid })
         ),
         ...toRemoveRelationUIDs.map(relation_uid =>
            removeGroupSlotSHDLTestRelation(relation_uid)
         ),
         updateGroupSlot(slotData.value.uid, {
            group_uid: slotData.value.group_uid,
            name: slotData.value.name,
            start: new Date(slotData.value.startdate + 'T' + slotData.value.starttime),
            end: new Date(slotData.value.enddate + 'T' + slotData.value.endtime),
         }),
      ])
      closeSlotDialog()
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch (err) {
      displaySnackbar({ text: "Erreur lors de la modification du créneau.", color: 'error', timeout: 4000 })
   } finally {
      savingSlot.value = false
   }
}

function closeSlotDialog() {
   slotEditRequest++
   addOrEditSlotDialog.value = false
   slotTestsLoading.value = false
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

const addMember = () => {
   alert(`TODO - Aller dans "Gestion des utilisateurs"`)
}

const deleteMember = () => {
   alert(`TODO - Aller dans "Gestion des utilisateurs"`)
}
</script>
