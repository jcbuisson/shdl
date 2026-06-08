
<template>
   <v-layout row wrap>
      <v-flex xs12>
         <v-card>
            <!--v-toolbar color="red darken-4" dark>
               <v-toolbar-title>{{ title }}</v-toolbar-title>
               <v-spacer></v-spacer>
               <v-text-field prepend-icon="search" hide-details single-line></v-text-field>
               <v-btn icon ripple @click="add()">
                  <v-icon>add</v-icon>
               </v-btn>
            </v-toolbar-->

            <v-list>
                <v-btn @click="moduleToAddName = null; moduleToAddType = 'personal'; moduleToAddTeam = null; addDialog = true"
                        fab small color="yellow"
                        top right absolute>
                    <v-icon>add</v-icon>
                </v-btn>

               <v-subheader>Personal modules</v-subheader>
               <template v-for="(module, index) in sorted(userModules)">
                  <v-list-tile ripple @click="selectModule(module.id)" :key="module.id"
                               v-bind:class="{ 'red': module.id == selectedModuleId, 'lighten-4': module.id == selectedModuleId }">
                     <v-list-tile-action>
                        <v-icon :color="iconColor(module)">{{ iconName(module) }}</v-icon>
                     </v-list-tile-action>
                     <v-list-tile-content>
                        <v-list-tile-title>{{ module.name }}</v-list-tile-title>
                        <v-list-tile-sub-title v-if="module.locked_date">locked on {{ moment(module.locked_date).format('YYYY-MM-DD, HH:mm') }}</v-list-tile-sub-title>
                     </v-list-tile-content>
                     <v-list-tile-action>
                        <v-btn icon ripple @click.stop="moduleToLock = clone(module); lockDialog = true" :disabled="!!module.locked_date">
                           <v-icon color="green lighten-1">lock</v-icon>
                        </v-btn>
                     </v-list-tile-action>
                     <v-list-tile-action>
                        <v-btn icon ripple @click.stop="moduleToDelete = clone(module); deleteDialog = true">
                           <v-icon color="grey lighten-1">delete</v-icon>
                        </v-btn>
                     </v-list-tile-action>
                  </v-list-tile>
                  <v-divider v-if="index + 1 < userModules.length" :key="module.id + '-'"></v-divider>
               </template>
               <v-card-text v-if="userModules.length === 0" style="height: 60px;" class="Aligner">
                  <v-icon>not_interested</v-icon>
               </v-card-text>

               <template v-for="(teamModules, teamId) in teamModulesDict">
                  <v-divider></v-divider>
                  <v-divider></v-divider>
                  <v-subheader>{{ teamDescription(teamId) }}</v-subheader>

                  <template v-for="(module, index) in teamModules">
                     <v-list-tile ripple @click="selectModule(module.id)" :key="module.id"
                                 v-bind:class="{ 'red': module.id == selectedModuleId, 'lighten-4': module.id == selectedModuleId }">
                        <v-list-tile-action>
                           <v-icon :color="iconColor(module)">{{ iconName(module) }}</v-icon>
                        </v-list-tile-action>
                        <v-list-tile-content>
                           <v-list-tile-title>{{ module.name }}</v-list-tile-title>
                           <v-list-tile-sub-title v-if="module.locked_date">locked on {{ moment(module.locked_date).format('YYYY-MM-DD, HH:mm') }}</v-list-tile-sub-title>
                        </v-list-tile-content>
                        <v-list-tile-action>
                           <v-btn icon ripple @click.stop="moduleToLock = clone(module); lockDialog = true" :disabled="module.locked_date">
                              <v-icon color="green lighten-1">lock</v-icon>
                           </v-btn>
                        </v-list-tile-action>
                        <v-list-tile-action>
                           <v-btn icon ripple @click.stop="moduleToDelete = clone(module); deleteDialog = true">
                              <v-icon color="grey lighten-1">delete</v-icon>
                           </v-btn>
                        </v-list-tile-action>
                     </v-list-tile>
                     <v-divider v-if="index + 1 < teamModules.length" :key="module.id + '-'"></v-divider>
                  </template>
                  <v-card-text v-if="teamModules.length === 0" style="height: 60px;" class="Aligner">
                     <v-icon>not_interested</v-icon>
                  </v-card-text>


               </template>
            </v-list>

         </v-card>
      </v-flex>

      <v-dialog v-model="addDialog" persistent max-width="400">
         <v-card>
            <v-card-title class="headline grey lighten-2">Add a module</v-card-title>
            <v-card-text>
                <v-container grid-list-md>
                    <v-layout wrap>
                        <v-flex>
                           <v-text-field
                              v-model="moduleToAddName"
                              label="Module name"
                              required
                              :error-messages="nameErrors"
                              @input="$v.moduleToAddName.$touch()"
                              blur="$v.moduleToAddName.$touch()"
                           ></v-text-field>
                           <div v-if="teams.length > 0">
                              <v-radio-group v-model="moduleToAddType" :mandatory="false">
                                 <v-radio label="Personal" value="personal"></v-radio>
                                 <v-radio label="Team" value="team"></v-radio>
                              </v-radio-group>
                              <v-select
                                 v-if="moduleToAddType === 'team'"
                                 label="Team"
                                 v-model="moduleToAddTeam"
                                 :items="teams"
                                 item-text="name"
                                 item-value="id"
                              ></v-select>
                           </div>
                        </v-flex>
                    </v-layout>
                </v-container>
            </v-card-text>
            <v-card-actions>
               <v-spacer></v-spacer>
               <v-btn :disabled="!formValid" color="brown darken-2" flat @click.native="addDialog = false; addModule()">Create</v-btn>
               <v-btn color="brown darken-2" flat @click.native="addDialog = false">Cancel</v-btn>
            </v-card-actions>
         </v-card>
      </v-dialog>

      <v-dialog v-model="deleteDialog" persistent max-width="400">
         <v-card>
            <v-card-title class="headline grey lighten-2">Confirm</v-card-title>
            <v-card-text>Delete {{ moduleToDelete.name }} ?</v-card-text>
            <v-card-actions>
               <v-spacer></v-spacer>
               <v-btn color="brown darken-2" flat @click.native="deleteDialog = false; deleteModule(moduleToDelete)">Delete</v-btn>
               <v-btn color="brown darken-2" flat @click.native="deleteDialog = false">Cancel</v-btn>
            </v-card-actions>
         </v-card>
      </v-dialog>

      <v-dialog v-model="lockDialog" persistent max-width="400">
         <v-card>
            <v-card-title class="headline grey lighten-2">Confirm</v-card-title>
            <v-card-text>Lock '{{ moduleToLock.name }}' ? This action cannot be undone.</v-card-text>
            <v-card-actions>
               <v-spacer></v-spacer>
               <v-btn color="brown darken-2" flat @click.native="lockDialog = false; lockModule(moduleToLock)">Lock</v-btn>
               <v-btn color="brown darken-2" flat @click.native="lockDialog = false">Cancel</v-btn>
            </v-card-actions>
         </v-card>
      </v-dialog>

   </v-layout>
</template>


<script>
   import _ from 'lodash'
   import { required } from 'vuelidate/lib/validators'
   import moment from 'moment'

   export default {

      props: {
         user: Object,
         teams: Array,
         selectedModuleId: Number,
      },

      data () {
         return {
            addDialog: false,
            lockDialog: false,
            deleteDialog: false,
            moduleToDelete: {},
            moduleToLock: {},
            moduleToAddName: null,
            moduleToAddType: 'personal',
            moduleToAddTeam: null,
            moment,
         }
      },

      computed: {
         userModules () {
            return this.$store.state.craps.user2moduleList.hasOwnProperty(this.user.id) ? this.$store.state.craps.user2moduleList[this.user.id].map(moduleId => this.$store.state.craps.modules[moduleId]) : []
         },
         teamModulesDict () {
            let dict = {}
            let self = this
            this.teams.forEach(function(team) {
               if (self.$store.state.craps.team2moduleList.hasOwnProperty(team.id)) {
                  dict[team.id] = self.$store.state.craps.team2moduleList[team.id].map(moduleId => self.$store.state.craps.modules[moduleId])
               }
            })
            return dict
         },
         formValid () {
            if (this.$v.moduleToAddName.$error) return false
            if (this.moduleToAddType === 'team' && this.moduleToAddTeam === null) return false
            return true
         },
         nameErrors () {
            const errors = []
            if (!this.$v.moduleToAddName.$dirty) return errors
            !this.$v.moduleToAddName.required && errors.push("Le nom est obligatoire")
            return errors
         },
      },

      methods: {
         clone (module) {
            return _.clone(module)
         },
         sorted (moduleList) {
            return _.sortBy(moduleList, [function(o) { return o.name }])
         },
         selectModule (moduleId) {
            this.$emit('moduleSelected', moduleId)
         },
         addModule () {
            this.$emit('addModule', this.moduleToAddName, (this.moduleToAddType === 'personal') ? null : this.moduleToAddTeam)
         },
         deleteModule (module) {
            this.$emit('deleteModule', module)
         },
         lockModule (module) {
            this.$emit('lockModule', module)
         },
         parseInfo (module) {
            return this.$store.state.craps.module2parseInfo[module.id]
         },
         isModuleOk (module) {
            if (this.$store.state.craps.module2parseInfo.hasOwnProperty(module.id)) {
               let parseInfo = this.$store.state.craps.module2parseInfo[module.id]
               return parseInfo.isOk
            } else {
               return null
            }
         },
         teamDescription (teamId) {
            let team = this.$store.state.teams.teams[teamId]
            let self = this
            let memberNames = team.members.map(function(userId) {
               let user = self.$store.state.users[userId]
               return user ? user.last_name : '--'
            })
            return `${team.name} (${memberNames.join(', ')})`
         },
         iconName (module) {
            let isOk = this.isModuleOk(module)
            if (isOk === null) {
               return 'more_horiz'
            } else if (isOk) {
               return 'check_circle'
            } else {
               return 'error_outline'
            }
         },
         iconColor (module) {
            let isOk = this.isModuleOk(module)
            if (isOk === null) {
               return 'gray'
            } else if (isOk) {
               return 'green'
            } else {
               return 'pink'
            }
         },
      },

      validations: {
         moduleToAddName: { required },
      },
   };
</script>

<style scoped>
</style