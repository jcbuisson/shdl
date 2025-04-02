<template>
   <v-card>
      <v-form v-model="valid" lazy-validation>
         <v-container>
            <v-row>
               <v-col cols="12" sm="6">
                  <v-text-field
                     label="Nom"
                     v-model="group.name"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
            </v-row>
         </v-container>
         <div class="submit-block">
            <v-btn @click="submit" :disabled="!valid" flat size="large" color="primary" style="min-width: 300px;;">Créer groupe</v-btn>
         </div>
      </v-form>
   </v-card>
</template>

<script setup>
import { ref } from 'vue'

import { create as createGroup } from '/src/use/useGroup'
import router from '/src/router'


const group = ref({})

const valid = ref()

async function submit() {
   await createGroup(group.value)
   router.back()
}
</script>

<style scoped>
.submit-block {
   display: flex;
   flex-direction: column;  
   align-items: center;
   padding: 20px;
}
</style>