<template>
   <v-card>
      <v-form>
         <v-container>

            <v-row>
               <v-col cols="12" md="6">
                  <v-text-field
                     label="Nom"
                     :modelValue="test?.name"
                     @input="(e) => onFieldInputDebounced('name', e.target.value)"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" md="2">
                  <v-text-field
                     type="number"
                     label="Coefficient"
                     :modelValue="test?.weight"
                     @input="(e) => onFieldInputDebounced('weight', parseInt(e.target.value))"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
            </v-row>

            <v-row>
               <v-textarea
                  label="Directives de test"
                  rows="20"
                  :modelValue="test?.test_statements"
                  @input="(e) => onFieldInputDebounced('test_statements', e.target.value)"
               ></v-textarea>
            </v-row>

            <v-row>
               <v-textarea
                  label="Contenu des mémoires"
                  rows="20"
                  :modelValue="test?.memory_contents"
                  @input="(e) => onFieldInputDebounced('memory_contents', e.target.value)"
               ></v-textarea>
            </v-row>

         </v-container>
      </v-form>
   </v-card>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'

import useExpressXClient from '/src/use/useExpressXClient';

import { useSHDLTest } from '/src/use/useSHDLTest'
import { displaySnackbar } from '/src/use/useSnackbar'

const { app } = useExpressXClient();
const { getObservable: tests$, update: updateTest } = useSHDLTest(app);


const props = defineProps({
   test_uid: {
      type: String,
   },
})

const test = ref()

let testSubscription

function test$(test_uid) {
   return tests$({ uid: test_uid }).pipe(
      map(tests => tests.length > 0 ? tests[0] : null)
   )
}

onUnmounted(() => {
   testSubscription && testSubscription.unsubscribe()
})

watch(() => props.test_uid, async (test_uid) => {
   testSubscription = test$(test_uid).subscribe(tst => {
      test.value = tst
   })
}, { immediate: true })


//////////////////////        TEXT FIELD EDITING        //////////////////////

const onFieldInput = async (field, value) => {
   try {
      await updateTest(props.test_uid, { [field]: value })
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la sauvegarde...", color: 'error', timeout: 4000 })
   }
}
const onFieldInputDebounced = useDebounceFn(onFieldInput, 500)
</script>
