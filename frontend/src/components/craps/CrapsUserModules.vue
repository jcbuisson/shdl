
<template>
   <v-layout row wrap>
      <v-flex class="xs12 sm4">
         <craps-module-list
            :user="user"
            :teams="teams"
            :selectedModuleId="selectedModuleId"
            @moduleSelected="selectModule"
            @addModule="addModule"
            @deleteModule="deleteModule"
            @lockModule="lockModule">
        </craps-module-list>
      </v-flex>

      <v-flex class="xs12 sm8">
         <router-view @userModuleUpdated="userModuleUpdated"></router-view>
      </v-flex>
   </v-layout>
</template>


<script>
   import CrapsModuleList from '@/components/craps/CrapsModuleList'
   import moment from 'moment'

   export default {

      props: {
         userId: Number,
         baseRoute: String,
      },

      components: {
         CrapsModuleList: CrapsModuleList,
      },

      mounted: async function() {
         // fetch user CRAPS modules in central store: reactivity will update the list view
         this.$store.dispatch('craps/GET_CRAPS_MODULES', { userId: this.userId, teamId: 0 })
         // fetch teams for which userId is a member
         let teams = await this.$store.dispatch('teams/GET_USER_TEAMS', this.userId)
         // for each team, fetch members & CRAPS modules: reactivity will update the list view
         let self = this
         teams.forEach(function(team) {
            self.$store.dispatch('craps/GET_CRAPS_MODULES', { userId: 0, teamId: team.id })
            team.members.forEach(function(userId) {
               self.$store.dispatch('GET_USER', userId)
            })
         })
      },

      data () {
         return {
            selectedModuleId: null,
         }
      },

      computed: {
         user() {
            return this.$store.state.users[this.userId]
         },
         teams() {
            if (this.$store.state.teams.user2teamList.hasOwnProperty(this.userId)) {
               return this.$store.state.teams.user2teamList[this.userId].map(teamId => this.$store.state.teams.teams[teamId])
            } else {
               return []
            }
         },
         selectedModule () {
            return this.$store.state.craps.modules[this.selectedModuleId]
         },
      },

      methods: {
         
         selectModule (moduleId) {
            // make the module selected in CrapsModuleList
            this.selectedModuleId = moduleId
            // change route
            this.$router.push(`${this.baseRoute}module/${moduleId}/editor`)
            // post event that module has been accessed
            let module = this.$store.state.craps.modules[moduleId]
            this.$store.dispatch('POST_HISTORY_EVENT', {
               author: this.$store.state.loggedUserId,
               user: this.user.id, // team = null
               message: { "text": "Accès au module " + module.name }
            })
         },
         unselectAll () {
            this.selectedModuleId = null
            // change route
            this.$router.push(this.baseRoute)
         },
         userModuleUpdated (moduleId) {
            this.$emit('userModuleUpdated', moduleId)
            this.selectedModuleId = moduleId
         },
         async addModule (name, teamId) {
            let moduleList = teamId ? this.$store.state.craps.team2moduleList[teamId] : this.$store.state.craps.user2moduleList[this.user.id]
            if (moduleList.map(moduleId => this.$store.state.craps.modules[moduleId].name).indexOf(name) !== -1) {
               this.$store.commit('SNACKBAR', { timeout: 3500, text: "Un module de ce nom existe déjà", color: 'red' })
            } else {
               try {
                  let addedModule = await this.$store.dispatch('craps/POST_CRAPS_MODULE', {
                     name: name,
                     user: teamId ? null : this.user.id,
                     team: teamId ? teamId : null,
                     update_author: this.$store.state.loggedUserId,
                     text: `// write your program here`,
                  })
                  this.selectModule(addedModule.id)
               } catch(e) {
                  this.$store.commit('SNACKBAR', { timeout: 3500, text: "Erreur lors de la création", color: 'red' })
               }
            }
         },
         async deleteModule (module) {
            try {
               await this.$store.dispatch('craps/DELETE_CRAPS_MODULE', module)
               await this.$store.dispatch('POST_HISTORY_EVENT', {
                  author: this.$store.state.loggedUserId,
                  user: this.user.id, // team = null
                  message: { "text": "Suppression du module " + module.name }
               })
               this.unselectAll()
            } catch(e) {
               this.$store.commit('SNACKBAR', { timeout: 3500, text: "Erreur lors de la suppression", color: 'red' })
            }
         },

         async lockModule (module) {
            console.log("lock module", module)
            try {
               module.locked_date = moment().format()
               await this.$store.dispatch('craps/PUT_CRAPS_MODULE', module)
            } catch(e) {
               console.log('error', e)
               this.$store.commit('SNACKBAR', { timeout: 3500, text: "Error while saving", color: 'red' })
            }
         },

      },
   };
</script>
