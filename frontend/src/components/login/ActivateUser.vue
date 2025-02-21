
<template>

   <div class="appearing main">

      <div class="main-container white-background">

         <div class='main-label black-color'>
            {{ title }}
         </div>
         
         <v-form ref="form" lazy-validation>
            <v-text-field
               label="Mot de passe"
               v-model="password"
               :error-messages="passwordErrors"
               @input="$v.password.$touch()"
               blur="$v.password.$touch()"
               :append-icon="hiddenPassword ? 'visibility' : 'visibility_off'"
               @click:append="() => (hiddenPassword = !hiddenPassword)"
               :type="hiddenPassword ? 'password' : 'text'"
            ></v-text-field>

            <v-text-field
               label="Mot de passe (confirmation)"
               v-model="passwordConfirmed"
               :error-messages="passwordConfirmedErrors"
               @input="$v.passwordConfirmed.$touch()"
               blur="$v.passwordConfirmed.$touch()"
               @keyup.enter.native="debouncedSubmit"
               :append-icon="hiddenPassword ? 'visibility' : 'visibility_off'"
               @click:append="() => (hiddenPassword = !hiddenPassword)"
               :type="hiddenPassword ? 'password' : 'text'"
            ></v-text-field>
            
            <div class="submit-block">
                <v-btn @click="debouncedSubmit" :disabled="!formValidAndDirty" flat dark style="width: 100%;">{{ submitButtonText }}</v-btn>
            </div>
         </v-form>

         <div>{{ errMsg }}</div>

      </div>
    
   </div>
   
</template>


<script>
   import router from '@/router'
   import { verifyToken } from '@/utilities/jwtToken.js'
   import config from '@/config'

   const axios = require("axios")
   import _ from 'lodash'
   import { required, minLength, sameAs } from 'vuelidate/lib/validators'
    
   export default {

      mounted: function() {
         // logout if necessary
         if (this.$store.state.authenticationData) {
            // commit event to vuex store
            this.$store.commit('RESET_STATE')
            // emit 'onLogout' event to App parent component
            this.$emit('onLogout')
         }
      },

      data () {
         return {
            username: '',
            email: '',
            password: '',
            passwordConfirmed: '',
            mode: this.initial_mode,
            hiddenPassword: true,
            errMsg: '',
         }
      },

      validations: {
         password: {
            required,
            minLength: minLength(6)
         },
         passwordConfirmed: {
            sameAsPassword: sameAs('password')
         },
      },

      computed: {
         passwordErrors () {
            const errors = []
            if (!this.$v.password.$dirty) return errors
            !this.$v.password.minLength && errors.push("Le mot de passe doit faire au moins 6 caractères")
            !this.$v.password.required && errors.push("Le mot de passe est obligatoire")
            return errors
         },
         passwordConfirmedErrors () {
            const errors = []
            if (!this.$v.passwordConfirmed.$dirty) return errors
            !this.$v.passwordConfirmed.sameAsPassword && errors.push("Les deux mots de passe doivent être identiques")
            return errors
         },
         title: function() {
            return "Choisissez un mot de passe"
         },
         submitButtonText: function() {
            return "Activer le compte";
         },
         formValid () {
            if (this.$v.password.$error) return false
            if (this.$v.passwordConfirmed.$error) return false
            return true
         },
         formDirty () {
            if (this.$v.password.$dirty) return true
            if (this.$v.passwordConfirmed.$dirty) return true
            return false
         },
         formValidAndDirty () {
            return this.formValid && this.formDirty
         },
      },
        
      methods: {
         debouncedSubmit: function() {
            let self = this
            _.debounce(() => {
               self.submit()
            }, 300, { 'leading': true, 'trailing': false })()
         },

         isFormInvalid: function() {
            return false
         },

         async submit() {
            this.$store.commit('WAITING', true)
            try {
               // get public key in PEM format (with separate lines, see https://github.com/auth0/node-jsonwebtoken/issues/331)
               let response = await axios.get(config.PUBLIC_KEY_URL, {})
               let publicKey = response.data
               // then verify the provided token with the public key
               let token = this.$route.query.token
               console.log('token=', token)
               let decodedToken = verifyToken(token, publicKey)
               console.log('decodedToken', decodedToken)
               // then activate user with token & password
               let user_id = decodedToken.user_id
               response = await axios({
                  method: 'post',
                  url: config.ACTIVATE_USER_URL,
                  data: {
                     token: token,
                     password: this.password,
                  },
               })
               let user = response.data
               console.log('user', user)
               this.$store.commit('SNACKBAR', { timeout: 1500, text: "Compte activé", color: 'green' })
               router.push(`/login?username=${user.username}`)
            } catch(error) {
               this.errMsg = error.message
            } finally {
               this.$store.commit('WAITING', false)
            }
         },

      },
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

