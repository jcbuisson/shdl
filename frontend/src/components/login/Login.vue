
<template>

   <div class="main" cclass="fullscreen appearing main global--background">

      <div 
         class="main-container"  style="border:1px solid black;"
         v-bind:class="{ 'white-background': isConnection, 'black-background': isSignUp }"
      >

         <div
            class='main-label'
            v-bind:class="{ 'black-color': isConnection, 'white-color': isSignUp }">
            {{ title }}
         </div>
         
         <v-form v-model="valid" ref="form" lazy-validation>
         
            <v-text-field
               v-if="isConnection"
               name="email"
               label="Email"
               v-model="email"
               :dark="isSignUp"
               required
               @keyup.enter.native="submit"
            ></v-text-field>

            <!-- see https://stackoverflow.com/questions/15738259/disabling-chrome-autofill -->
            <v-text-field
               v-if="isConnection"
               name="password"
               label="Mot de passe"
               autocomplete="new-password"
               v-model="password"
               :rules="passwordRules"
               required
               @keyup.enter.native="submit"
               :append-icon="hiddenPassword ? 'visibility' : 'visibility_off'"
               @click:append="() => (hiddenPassword = !hiddenPassword)"
               :type="hiddenPassword ? 'password' : 'text'"
            ></v-text-field>

         
            <v-text-field
               v-if="isSignUp"
               name="email"
               label="email"
               v-model="email"
               :rules="emailRules"
               autocomplete="new-password"
               dark
               required
            ></v-text-field>

            <v-text-field
               v-if="isSignUp"
               name="first_name"
               label="Prénom"
               v-model="first_name"
               dark
               required
            ></v-text-field>

            <v-text-field
               v-if="isSignUp"
               name="last_name"
               label="Nom"
               v-model="last_name"
               dark
               required
            ></v-text-field>
            
            <div class="submit-block">
                <v-btn @click="submit" :disabled="!valid" flat dark style="width: 100%;">{{ submitButtonText }}</v-btn>
            </div>
         </v-form>

         <div class="err-msg">
            {{ errMsg }}
         </div>

         <div class="forgot-password-block">
            <a href="/forgot_password"
               v-if="isConnection"
               class="forgot-password connection">
               Mot de passe oublié ?
            </a>
         </div>
      </div>
    
      <div class="sign-up-block" v-if="platform === 'shdl' || !isProduction">
         <v-btn flat dark @click="onModeButtonTap" style="width: 100%;">{{ modeButtonText }}</v-btn>
      </div>

   </div>
</template>


<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
   // 'connection' or 'sign-up'
   initial_mode: {
      type: String,
      default: 'connection',
   },
})

const email = ref('')
const first_name = ref('')
const last_name = ref('')
const password = ref('')
const valid = ref(false)
const mode = ref(props.initial_mode)
const hiddenPassword = ref(true)
const emailRules = [
   (v) => !!v || "L'e-mail est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "l'email doit être valide"
]
const passwordRules = [
   (v) => !!v || 'Le mot de passe est obligatoire',
   (v) => !!v && v.length >= 6 || 'Le mot de passe doit faire au moins 6 caractères'
]
const errMsg = ref('')

const title = computed(() => isConnection.value ? "Connexion" : "Créer un compte")
const isConnection = computed(() => mode.value === 'connection')
const isSignUp = computed(() => mode.value === 'sign-up')
const submitButtonText = computed(() => isConnection.value ? "Se connecter" : "Créer le compte")
const modeButtonText = computed(() => isConnection.value ? "Créer un compte" : "Retour à la connexion")
        
function onModeButtonTap() {
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
      signUpAsSelfRegistered()
   }
}

async function signIn () {
   this.$store.commit('WAITING', true)
   try {
      let response
      // ask server for a token, signed with the private key
      response = await axios({
         method: 'post',
         url: config.TOKEN_URL,
         data: {
            username: this.username,
            password: this.password,
         },
      })
      let token = response.data
      //console.log('token', token)
      // then get public key in PEM format (with separate lines, see https://github.com/auth0/node-jsonwebtoken/issues/331)
      response = await axios.get(config.PUBLIC_KEY_URL, {})
      let publicKey = response.data
      // then verify the provided token with the public key
      let decodedToken = verifyToken(token, publicKey)
      //console.log('decodedToken', decodedToken)
      // then load user data
      response = await axios({
         method: 'get',
         url: `${config.USERS_URL}${decodedToken.user_id}/`,
         headers: {"Authorization": `JWT ${token}`},
      })
      let user_data = response.data
      //console.log('user_data', user_data)
      // commit changes in vuex
      this.$store.commit('SET_LOGGED_USER', user_data)
      // commit login in vuex state, with token & public key
      this.$store.commit('SET_AUTHENTICATION_DATA', {
         token: token,
         decodedToken: decodedToken,
         publicKey: publicKey
      })
      // get realms - necessary for several store.getters
      await this.$store.dispatch('GET_REALMS')
      // get roles - necessary for several store.getters
      await this.$store.dispatch('GET_ROLES')
      // look for route to go to for App component
      let url
      if (this.$route.query.next) {
         // special case when when route is specified in query param
         url = this.$route.query.next
      } else {
         // get first user's roles
         let firstGroup = this.$store.state.roles[user_data.group_ids[0]]
         // get first authorization's url
         url = firstGroup.authorizations[0].url
         //console.log('url', url)
      }
      // then emit 'onLogin' to App parent component
      this.$emit('onLogin', url)
   } catch(e) {
      console.log('login error', e)
      let errorText = "Erreur inconnue"
      if (e.response && e.response.status && e.response.status === 400) {
         errorText = "Identifiant / mot de passe incorrects, ou compte inactivé"
      }
      this.$store.commit('SNACKBAR', { timeout: 3500, text: errorText, color: 'red' })
   } finally {
      this.$store.commit('WAITING', false)
   }
}

async function signUpAsSelfRegistered () {
   this.$store.commit('WAITING', true)
   try {
      let userId = await this.$store.dispatch('CREATE_USER', {
         username: this.username,
         email: this.email,
         first_name: this.first_name,
         last_name: this.last_name,
         tag: this.tag,
      })
      // then display message
      this.$store.commit('SNACKBAR', { timeout: 3500, text: `Compte utilisateur ${this.username} créé. Un mail d'activation vient d'être envoyé à ${this.email}`, color: 'green' })
      // then go in 'connection' mode
      this.mode = 'connection'
   } catch(err) {
      this.$store.commit('SNACKBAR', { timeout: 3500, text: err.message, color: 'red' })
      this.errMsg = err.message
   } finally {
      this.$store.commit('WAITING', false)
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
