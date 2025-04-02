<template>
   <v-card>
      <v-form>
         <v-container>
            <v-row>
               <v-col cols="12" sm="6">
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
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import { findMany as findManyGroup, update as updateGroup } from '/src/use/useGroup'
import { displaySnackbar } from '/src/use/useSnackbar'


const props = defineProps({
   group_uid: {
      type: String,
   },
})

const group = ref()

let groupSubscription

onUnmounted(() => {
   if (groupSubscription) groupSubscription.unsubscribe()
})

watch(() => props.group_uid, async (group_uid) => {
   if (groupSubscription) groupSubscription.unsubscribe()
   const groupObservable = await findManyGroup({ uid: group_uid})
   groupSubscription = groupObservable.subscribe(([group_]) => group.value = group_)
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
</script>
