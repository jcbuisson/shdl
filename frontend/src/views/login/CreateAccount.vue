<template>
   <div class="appearing main">
      <div class="main-container white-background"  style="border:1px solid black;">

         <div class='main-label black-color'>
            Création de compte : choisissez un mot de passe
         </div>
         
         <v-text-field
            v-if="isSignUp"
            name="firstname"
            label="Prénom"
            v-model="firstname"
            required
         ></v-text-field>

         <v-text-field
            v-if="isSignUp"
            name="lastname"
            label="Nom"
            v-model="lastname"
            required
         ></v-text-field>

         <v-form v-model="valid" lazy-validation>
            <v-text-field
               label="Mot de passe"
               autofocus tabindex="1"
               v-model="password"
               :rules="passwordRules"
               required
               :append-inner-icon="hiddenPassword ? 'mdi-eye' : 'mdi-eye-off'"
               @click:append-inner="() => (hiddenPassword = !hiddenPassword)"
               :type="hiddenPassword ? 'password' : 'text'"
            ></v-text-field>

            <v-text-field
               label="Mot de passe (confirmation)"
               tabindex="2"
               v-model="passwordConfirmed"
               :rules="passwordConfirmRules"
               required
               :append-inner-icon="hiddenPassword ? 'mdi-eye' : 'mdi-eye-off'"
               @click:append-inner="() => (hiddenPassword = !hiddenPassword)"
               :type="hiddenPassword ? 'password' : 'text'"
               @keyup.enter.native="submit"
            ></v-text-field>
            
            <div class="submit-block">
                <v-btn @click="submit" :disabled="!valid" flat size="large" color="indigo-darken-3" style="width: 100%;">Créer compte</v-btn>
               </div>
         </v-form>

      </div>
   </div>

   <v-snackbar v-model="snackbar.visible" :timeout="snackbar.timeout" :color="snackbar.color">
      {{ snackbar.text }}
   </v-snackbar>
</template>

<script setup>
import { ref } from 'vue'
import { importSPKI, jwtVerify } from "jose"

import router from '/src/router'
import { app } from '/src/client-app.js'


const props = defineProps({
   token: {
      type: String,
   },
})
const passwordRules = [
   (v) => !!v || 'Le mot de passe est obligatoire',
   (v) => !!v && v.length >= 6 || 'Le mot de passe doit faire au moins 6 caractères',
]

const passwordConfirmRules = [
   ...passwordRules,
   (v) => !!v && password.value && v === password.value || 'Les deux mots de passe ne sont pas identiques',
]

const valid = ref()
const password = ref('')
const passwordConfirmed = ref('')
const hiddenPassword = ref(true)
const firstname = ref('')
const lastname = ref('')
const snackbar = ref({})

function displaySnackbar({ text, color, timeout }) {
   snackbar.value = { text, color, timeout, visible: true }
}

async function submit() {
   try {
      const publicKeyPEM = import.meta.env.VITE_APP_JWT_PUBLIC_KEY
      const publicKey = await importSPKI(publicKeyPEM, 'RS256')
      const { payload } = await jwtVerify(props.token, publicKey)
      console.log('payload', payload)
      await app.service('auth').createAccountWithToken(props.token, password.value, firstname.value, lastname.value)
      router.push('/login')
   } catch(err) {
      console.log('err', err)
      displaySnackbar({ text: "Erreur inconnue", color: 'error', timeout: 2000 })
   }
}
</script>


<style scoped lang="scss" type="text/scss">

   $WIDTH: 400px;

   .main {
      display: flex;
      flex-direction: column;  
      align-items: center;
   }

   .main-container {
      flex: 1;
      width: $WIDTH;
      margin-top: 120px;
      margin-bottom: 30px;
      margin-left: 30px;
      margin-right: 30px;
      padding-bottom: 20px;
      padding-left: 20px;
      padding-right: 20px;
   }
   .white-background {
      background-color: white;
   }
   .main-label {
      text-align: center;
      color: #311217;
      font-size: 24px;
      margin-top: 30px;
      margin-bottom: 10px;
      letter-spacing: 0.2;
   }
   .black-color {
      color: gray;
   }
   .white-color {
      color: white;
   }

   .submit-block {
      background-color: #CB1D00;
   }
</style>

