<template>
   <div class="main" cclass="fullscreen appearing main global--background">
      <div class="main-container white-background" style="border:1px solid black;">

         <div class='main-label black-color'>
            {{ title }}
         </div>
         
         <v-form v-model="valid" ref="form" lazy-validation>
         
            <v-text-field
               name="email"
               label="Email"
               autofocus tabindex="1"
               v-model="email"
               :rules="emailRules"
               :autocomplete= 'isConnection ? "new-password" : null'
               required
               @keyup.enter.native="submit"
            ></v-text-field>

            <!-- see https://stackoverflow.com/questions/15738259/disabling-chrome-autofill -->
            <v-text-field
               v-if="isConnection"
               name="password"
               label="Mot de passe"
               tabindex="2"
               autocomplete="new-password"
               v-model="password"
               :rules="passwordRules"
               required
               @keyup.enter.native="submit"
               :append-inner-icon="hiddenPassword ? 'mdi-eye' : 'mdi-eye-off'"
               @click:append-inner="() => (hiddenPassword = !hiddenPassword)"
               :type="hiddenPassword ? 'password' : 'text'"
            ></v-text-field>
            
            <div class="submit-block">
               <v-btn @click="submit" :disabled="!valid" flat color="indigo-darken-3" style="width: 100%;">{{ submitButtonText }}</v-btn>
            </div>
         </v-form>

         <div class="forgot-password-block">
            <a href="/forgotten-password"
               v-if="isConnection"
               class="forgot-password connection">
               Mot de passe oublié ?
            </a>
         </div>
      </div>
    
      <div class="sign-up-block">
         <v-btn flat color="black" @click="onModeButtonTap" style="width: 100%; height: 50px;">{{ modeButtonText }}</v-btn>
      </div>

   </div>
</template>


<script setup>
import { ref, computed } from 'vue'

import { displaySnackbar } from '/src/use/useSnackbar'
import router from '/src/router'
import { signin, signup } from "/src/use/useAuthentication"

const props = defineProps({
   // 'connection' or 'sign-up'
   initial_mode: {
      type: String,
      default: 'connection',
   },
})

const email = ref('')
const password = ref('')
const valid = ref(false)
const mode = ref(props.initial_mode)
const hiddenPassword = ref(true)

const emailRules = [
   (v) => !!v || "L'email est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "l'email doit être valide"
]
const passwordRules = [
   (v) => !!v || 'Le mot de passe est obligatoire',
   (v) => !!v && v.length >= 6 || 'Le mot de passe doit faire au moins 6 caractères'
]

const title = computed(() => isConnection.value ? "Connexion" : "Créer un compte")
const isConnection = computed(() => mode.value === 'connection')
const isSignUp = computed(() => mode.value === 'sign-up')
const submitButtonText = computed(() => isConnection.value ? "Se connecter" : "Vérifier l'email")
const modeButtonText = computed(() => isConnection.value ? "Créer un compte" : "Retour à la connexion")

function onModeButtonTap() {
   console.log('onModeButtonTap')
   email.value = ''
   password.value = ''
   if (isConnection.value) {
      mode.value = 'sign-up';
   } else {
      mode.value = 'connection'
   }
}

function submit() {
   if (isConnection.value) {
      signIn()
   } else {
      signUp()
   }
}

const errorCodes = {
   'wrong-credentials': "email ou mot de passe incorrect",
}

async function signIn () {
   try {
      const user = await signin(email.value, password.value)
      console.log('user', user)
      router.push(`/home/${user.uid}/users`)
   } catch(err) {
      const text = errorCodes[err.code] || "Erreur inconnue"
      displaySnackbar({ text, color: 'error', timeout: 2000 })
   }
}

async function signUp () {
   try {
      await signup(email.value)
      const text = `Veuillez vérifier votre boite mail '${email.value}', des instructions d'activation viennent d'y être envoyées.`
      displaySnackbar({ text, color: 'success', timeout: 5000 })
   } catch(err) {
      const text = errorCodes[err.code] || "Erreur inconnue"
      displaySnackbar({ text, color: 'error', timeout: 4000 })
   }
}
</script>

<style scoped lang="scss" type="text/scss">

    $WIDTH: 350px;

   .global--background {
      background-image: url("/static/img/common/bg_login@3x.jpg");
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
   }

   .main {
      display: flex;
      flex-direction: column;  
      align-items: center;
   }

   .main-container {
      flex: 1;
      width: $WIDTH;
      margin-top: 120px;
      margin-left: 30px;
      margin-right: 30px;
      padding-left: 20px;
      padding-right: 20px;
   }
   .black-background {
      background-color: #5C4038;
   }
   .white-background {
      background-color: white;
   }
   .main-label {
      text-align: center;
      color: #311217;
      font-size: 36px;
      margin-top: 30px;
      margin-bottom: 10px;
      letter-spacing: 0.2;
   }
   .black-color {
      color: brown;
   }
   .white-color {
      color: white;
   }

   img.logo-container {
      margin-top: 5px;
      margin-bottom: 20px;
   }

   .submit-block {
      background-color: #CB1D00;
   }

   .sign-up-block {
      background-color: #311217;
      text-align: center;
      width: $WIDTH;
   }

   .forgot-password-block {
      margin-top: 10px;
      margin-bottom: 20px;
      height: 20px;
   }
   .forgot-password {
      font-size: 13px;
      text-decoration: none;
   }
   .forgot-password.connection {
      color: black;
   }
   .forgot-password.signup {
      color: white;
   }
</style>
