<template>
   <v-card class="d-flex flex-column fill-height">
      <v-toolbar color="green-darken-3" density="compact">
         <v-btn icon="mdi-plus" variant="text" @click="addSlot"></v-btn>
         Créneaux horaires
      </v-toolbar>
   
      <!-- Fills remaining vertical space -->
      <div class="d-flex flex-column flex-grow-1 overflow-auto">
         <!-- <v-list-item three-line v-for="(slot, index) in slotList":key="index" :value="slot" @click="selectSlot(slot)" :active="selectedSlot?.uid === slot?.uid">
            <v-list-item-title>{{ slot.name }}</v-list-item-title>

            <template v-slot:append>
               <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteSlot(slot)"></v-btn>
            </template>
         </v-list-item> -->

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

   <v-dialog v-model="addSlotDialog" max-width="400">
      <v-card title="Nouveau slot">
         <v-card-text>
            <v-row dense>
               <v-col cols="12" md="12">
                  <v-text-field label="Nom" required v-model="data.name"></v-text-field>
                  <v-row dense>
                     <v-text-field
                        label="date début"
                        v-model="data.startdate"
                        type="date"
                     ></v-text-field>
                     <v-text-field
                        label="heure"
                        v-model="data.starttime"
                        type="time"
                     ></v-text-field>
                  </v-row>
                  <v-row dense>
                     <v-text-field
                        label="date fin"
                        v-model="data.enddate"
                        type="date"
                     ></v-text-field>
                     <v-text-field
                        label="heure"
                        v-model="data.endtime"
                        type="time"
                     ></v-text-field>
                  </v-row>
               </v-col>
            </v-row>
         </v-card-text>

         <v-divider></v-divider>

         <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text="Annuler" variant="plain" @click="addSlotDialog = false"></v-btn>
            <v-btn color="primary" text="OK" variant="tonal" @click="addSlotDialog = false; createSlot()"></v-btn>
         </v-card-actions>
      </v-card>
   </v-dialog>

</template>

<script setup>
import { ref, onUnmounted, watch } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { addPerimeter as addGroupSlotPerimeter, create as createGroupSlot, remove as removeGroupSlot } from '/src/use/useGroupSlot'
import { displaySnackbar } from '/src/use/useSnackbar'


const props = defineProps({
   group_uid: {
      type: String,
   },
})

const slotList = ref([])

let groupSlotPerimeter

watch(() => props.group_uid, async (group_uid) => {
   if (groupSlotPerimeter) await groupSlotPerimeter.remove()
   groupSlotPerimeter = await addGroupSlotPerimeter({ group_uid }, async list => {
      slotList.value = list.toSorted((u1, u2) => (u1.start > u2.start) ? 1 : (u1.start < u2.start) ? -1 : 0)
   })
}, { immediate: true })

onUnmounted(() => {
   groupSlotPerimeter && groupSlotPerimeter.remove()
})

const addSlotDialog = ref(false)
const data = ref({})

async function addSlot() {
   addSlotDialog.value = true
}

async function editSlot() {
   // addSlotDialog.value = true
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
</script>