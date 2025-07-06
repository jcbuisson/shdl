<template>
   <SplitPanel>
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">

            <!-- Toolbar (does not grow) -->
            <v-toolbar color="red-darken-4" ddensity="compact">
               <v-text-field v-model="nameFilter" label="Recherche par nom..." class="px-2" single-line clearable></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="addTest"></v-btn>
            </v-toolbar>
         
            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="(test, index) in filteredSortedTestList" :key="index"
                     :value="test" @click="selectTest(test)" :active="selectedTest?.uid === test.uid">
                  <v-list-item-title>{{ test?.name }}</v-list-item-title>

                  <template v-slot:append>
                     <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteTest(test)"></v-btn>
                  </template>
               </v-list-item>
            </div>
         </v-card>

      </template>

      <template v-slot:right-panel>
         <router-view></router-view>
      </template>
   </SplitPanel>
</template>


<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute} from 'vue-router'
import { Observable, from, map, of, merge, combineLatest, forkJoin, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, concatMap, scan, tap, catchError, take, debounceTime } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import { useSHDLTest } from '/src/use/useSHDLTest'

import { displaySnackbar } from '/src/use/useSnackbar'
import { extendExpiration } from "/src/use/useAuthentication"

import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'

const { getObservable: tests$, remove: removeTest } = useSHDLTest()


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const testList = useObservable(tests$({}))
const sortedTestList = computed(() => testList.value ? testList.value.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0) : [])

const nameFilter = ref('')

const filteredSortedTestList = computed(() => {
   if (!sortedTestList.value) return []
   const nameFilter_ = (nameFilter.value || '').toLowerCase()
   return sortedTestList.value.filter(test => {
      if (nameFilter_.length === 0) return true
      if (test.name.toLowerCase().indexOf(nameFilter_) > -1) return true
      return false
   })
})


async function addTest() {
   router.push(`/home/${props.signedinUid}/tests/create`)
}

// const route = useRoute()
// const routeRegex = /home\/[a-z0-9]+\/tests\/([a-z0-9]+)/

// watch(() => [route.path, testAndGroupsList.value], async () => {
//    if (!testAndGroupsList.value) return
//    selectedTest.value = null
//    const match = route.path.match(routeRegex)
//    if (!match) return
//    const test_uid = route.path.match(routeRegex)[1]
//    const test = testAndGroupsList.value.map(testAndGroups => testAndGroups.test).find(test => test.uid === test_uid)
//    selectTest(test)
// }, { immediate: true })

const selectedTest = ref()

function selectTest(test) {
   extendExpiration()
   selectedTest.value = test
   router.push(`/home/${props.signedinUid}/tests/${test.uid}`)
}

async function deleteTest(test) {
   // const testGroupRelations = await firstValueFrom(testGroupRelations$({ test_uid: test.uid }))
   if (window.confirm(`Supprimer ${test.name} ?`)) {
      try {


         // REMLOVE TEST-SLOT RELATIONS


         // // remove test-group relations
         // await Promise.all(testGroupRelations.map(relation => removeGroupRelation(relation.uid)))
         // remove test
         await removeTest(test.uid)
         router.push(`/home/${props.signedinUid}/tests`)
         displaySnackbar({ text: "Suppression effectuée avec succès !", color: 'success', timeout: 2000 })
      } catch(err) {
         displaySnackbar({ text: "Erreur lors de la suppression...", color: 'error', timeout: 4000 })
      }
   }
}
</script>
