<template>
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

import { useGroup3 } from '/src/use/useGroup3'
import { displaySnackbar } from '/src/use/useSnackbar'

import GroupSlots from '/src/views/GroupSlots.vue'

const { addPerimeter: addGroupPerimeter, update: updateGroup } = useGroup3()


const props = defineProps({
   group_uid: {
      type: String,
   },
})

const group = ref()

let groupPerimeter

onUnmounted(() => {
   groupPerimeter && groupPerimeter.remove()
})

watch(() => props.group_uid, async (group_uid) => {
   if (groupPerimeter) await groupPerimeter.remove()
   groupPerimeter = await addGroupPerimeter({ uid: group_uid }, ([group_]) => {
      group.value = group_
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
</script>
