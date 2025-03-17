<template>
   <div class="appearing main">
      <div class="main-container white-background"  style="border:1px solid black;">

         <div class='main-label black-color'>
            Mot de passe oublié
         </div>
         
         <v-form v-model="valid" lazy-validation>
            <v-text-field
               name="email"
               label="Email"
               autofocus tabindex="1"
               v-model="email"
               :rules="emailRules"
               :dark="isSignUp"
               :autocomplete= 'isConnection ? "new-password" : null'
               required
               @keyup.enter.native="submit"
            ></v-text-field>

            <div class="submit-block">
                <v-btn @click="submit" :disabled="!valid" flat size="large" color="indigo-darken-3" style="width: 100%;">Valider</v-btn>
               </div>
         </v-form>

      </div>
   </div>
</template>

<script setup>
import { ref } from 'vue'

import { displaySnackbar } from '/src/use/useSnackbar'
import { app } from '/src/client-app.js'

const emailRules = [
   (v) => !!v || "L'e-mail est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "l'email doit être valide"
]

const valid = ref()
const email = ref('')

async function submit() {
   try {
      await app.service('auth').forgottenPassword(email.value)
      const text = `Veuillez vérifier votre boite mail '${email.value}', des instructions viennent d'y être envoyées.`
      displaySnackbar({ text, color: 'success', timeout: 5000 })
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

