
<template>
   <v-card color="grey lighten-4" class="carte" v-if="msgText.length > 0">
      <v-card-text>
         <v-container fluid>
            <v-layout row wrap>
               <v-flex xs12>
                  <h3 style="text-align: center;">{{ msgText }}</h3>
               </v-flex>
            </v-layout>

         </v-container>
         <v-btn block color="primary" @click.native="onClick()" dark>OK</v-btn>
      </v-card-text>
   </v-card>
</template>


<script>
   const axios = require("axios")
    
   export default {

      props: {
         acceptInvitationUrl: String,
         token: String,
      },

      async mounted () {
         // run the webservice which associates the user to the coach
         await axios({
            method: 'post',
            url: this.acceptInvitationUrl,
            data: {
               token: this.token
            },
         })
         this.msgText = "L'utilisateur vient d'être ajouté à ceux que vous coachez"
      },

      data () {
         return {
            msgText: '',
         }
      },
        
      methods: {
         onClick () {
            this.$router.push('/')
         },
      },
   }

</script>


<style scoped lang="scss" type="text/scss">
   .carte {
     margin: 50px;
   }
</style>

