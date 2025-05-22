<template>
   <SplitPanel>
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn readonly icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="addModule"></v-btn>
            </v-toolbar>
         
            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="(group, index) in moduleList":key="index" :value="group" @click="selectModule(group)" :active="selectedModule?.uid === group?.uid">
                  <v-list-item-title>{{ group.name }}</v-list-item-title>

                  <template v-slot:append>
                     <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteModule(group)"></v-btn>
                  </template>
               </v-list-item>
            </div>
         </v-card>
      </template>

      <template v-slot:right-panel>
         <router-view></router-view>
      </template>
   </SplitPanel>

   <v-dialog v-model="addModuleDialog" max-width="400">
      <v-card title="Nouveau module SHDL">
        <v-card-text>
            <v-row dense>
               <v-col cols="12" md="12">
                  <v-text-field label="Nom" required v-model="moduleName"
                  ></v-text-field>
               </v-col>
            </v-row>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            text="Annuler"
            variant="plain"
            @click="addModuleDialog = false"
          ></v-btn>

          <v-btn
            color="primary"
            text="OK"
            variant="tonal"
            @click="addModuleDialog = false; createModule()"
          ></v-btn>
        </v-card-actions>
      </v-card>
   </v-dialog>

</template>


<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute} from 'vue-router'

import { addPerimeter as addUserShdlModulePerimeter, create as createUserShdlModule, remove as removeUserShdlModule } from '/src/use/useUserShdlModule'
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'
import { displaySnackbar } from '/src/use/useSnackbar'


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const filter = ref('')

const moduleList = ref([])

let userShdlModulePerimeter

onMounted(async () => {
   userShdlModulePerimeter = await addUserShdlModulePerimeter({ user_uid: props.signedinUid }, async list => {
      moduleList.value = list.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0)
   })
})

onUnmounted(async () => {
   await userShdlModulePerimeter.remove()
})

const addModuleDialog = ref(false)
const moduleName = ref('')

async function addModule() {
   addModuleDialog.value = true
}

const selectedModule = ref(null)

function selectModule(module) {
   selectedModule.value = module
   router.push(`/home/${props.signedinUid}/shdl/${module.uid}`)
}

async function createModule() {
   const createdModule = await createUserShdlModule({
      user_uid: props.signedinUid,
      name: moduleName.value,
      text: `module ${moduleName.value}()\nend module`,
   })
   console.log('createdModule', createdModule)
}

async function deleteModule(module) {
   if (window.confirm(`Supprimer le module ${module.name} ?`)) {
      try {
         await removeUserShdlModule(module.uid)
         router.push(`/home/${props.signedinUid}/shdl`)
         displaySnackbar({ text: "Suppression effectuée avec succès !", color: 'success', timeout: 2000 })
      } catch(err) {
         displaySnackbar({ text: "Erreur lors de la suppression...", color: 'error', timeout: 4000 })
      }
   }
}

const route = useRoute()
const routeRegex = /\/home\/([a-z0-9]+)\/shdl\/([a-z0-9]+)/

watch(() => [route.path, moduleList.value], async () => {
   const match = route.path.match(routeRegex)
   if (!match) return
   const uid = match[2]
   selectedModule.value = moduleList.value.find(module => module.uid === uid)
}, { immediate: true })
</script>
