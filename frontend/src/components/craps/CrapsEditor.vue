
<template>
   <v-layout row wrap>

      <v-flex class="sm12">
         <v-toolbar dense :color="errorMsg ? 'red' : 'green'" dark>
            <v-toolbar-title>
               <h6>{{ footerMsg }}</h6>
            </v-toolbar-title>
         </v-toolbar>
      </v-flex>

      <v-flex class="sm12">
         <craps-code-mirror
            ref="editor"
            :value="moduleCopy.text"
            :selectedline="selectedline"
            :styleactiveline="styleactiveline"
            @change="codeChanged"
         ></craps-code-mirror>
      </v-flex>

   </v-layout>
</template>


<script>

/* Voir Pegjs.org pour un Codemirror ajusté à la taille de l'écran :
function doLayout() {
    $("#left-column").height("0px");    // needed for IE
    $("#right-column").height("0px");   // needed for IE
    $(".CodeMirror").height("0px");
    $("#input").height("0px");

    $("#left-column").height(($("#left-column").parent().innerHeight() - 2) + "px");     // needed for IE
    $("#right-column").height(($("#right-column").parent().innerHeight() - 2) + "px");   // needed for IE
    $(".CodeMirror").height(($(".CodeMirror").parent().parent().innerHeight() - 14) + "px");
    $("#input").height(($("#input").parent().parent().innerHeight() - 14) + "px");
  }
*/

   import CrapsCodeMirror from '@/components/craps/CrapsCodeMirror'

   import { checkModule } from '@/utilities/craps/crapsChecker.js'
   import debounce from 'lodash/debounce'

   export default {

      props: {
         module: Object,
      },

      components: {
         CrapsCodeMirror
      },

      data () {
         return {
            moduleCopy: {text:''},
            selectedline: 0,
            styleactiveline: null,
            errorMsg: null,
            footerMsg: null,
         }
      },

      mounted: function() {
         // we work with a copy of the Vuex object, which cannot be changed directly
         this.moduleCopy = Object.assign({}, this.$store.state.craps.modules[this.module.id])
         this.parseModule()
         // set editor height dynamically
         let element = this.$refs.editor.$el.parentElement
         element.style.height = (this.$store.state.appHeight - 233) + 'px'
      },

      beforeDestroy: function() {
         console.log('beforeDestroy...')
         this.saveCurrentIfModified()
      },

      watch: {
         'module.id': function (newVal, oldVal) {
            //console.log('module.id changed from/to', oldVal, newVal)
            if (newVal) {
               // newVal is not undefined (happens when deleting a module)
               // previous module is still this.moduleCopy
               this.saveCurrentIfModified()
               // we work with a copy of the Vuex object, which cannot be changed directly
               // the change of moduleCopy.text will trigger a 'codeChanged' event
               this.moduleCopy = Object.assign({}, this.$store.state.craps.modules[newVal])
            }
         },
      },

      computed: {
         userOrTeamModuleIds () {
            return this.module.user ? this.$store.state.craps.user2moduleList[this.module.user] : this.$store.state.craps.team2moduleList[this.module.team]
         },
         isOk () {
            return (this.errorMsg === null)
         },
      },

      methods: {
         testHeight () {
            let element = this.$refs.editor.$el.parentElement
            console.log(element.style)
            element.style.height = '550px'
         },
         save (module) {
            console.log('saving', module.name)
            module.update_author = this.$store.state.loggedUserId
            try {
               return this.$store.dispatch('craps/PUT_CRAPS_MODULE', module)
            } catch(e) {
               this.$store.commit('SNACKBAR', { timeout: 3500, text: "Erreur lors de l'enregistrement", color: 'red' })
            }
         },
         saveCurrentIfModified () {
            let vuexModule = this.$store.state.craps.modules[this.moduleCopy.id]
            if (vuexModule && vuexModule.text != this.moduleCopy.text) {
               this.save(this.moduleCopy)
            }
         },

         // triggered when user edits text, or when this.module.id is changed
         codeChanged (text) {
            //console.log("code changed")
            this.moduleCopy.text = text
            this.parseModuleDebounced()
            this.autoSaveProgram()
         },

         parseModule: function() {
            let errorMsg, lines, symbols, memory
            ({ errorMsg, lines, symbols, memory } = checkModule(this.moduleCopy))
            if (errorMsg) {
               this.errorMsg = errorMsg
               this.footerMsg = errorMsg
            } else {
               this.errorMsg = null
               this.footerMsg = "Program OK"
            }
            console.log('memory', memory, 'symbols', symbols)

            // commit checking info in Vuex (even in error, to update isOK)
            this.$store.commit('craps/UPDATE_MODULE_PARSE_INFO', {
               moduleId: this.moduleCopy.id,
               memory: memory,
               symbols: symbols,
               isOk: this.isOk,
            })

            this.$forceUpdate()
         },
         
         parseModuleDebounced: debounce(function() {
            this.parseModule()
         }, 500),
         
         // note the use of lodash's debounce function to prevent immediate and too frequent saving
         autoSaveProgram: debounce(function() {
            this.saveCurrentIfModified()
         }, 3000),
      },

  }

</script>
