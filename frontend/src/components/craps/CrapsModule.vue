<template>
   <div>
         <v-tabs centered dark color="brown lighten-1" v-model="currentTab">
            <v-tabs-slider color="yellow"></v-tabs-slider>
            <v-tab :to="baseRoute + 'editor'" router key="editor">
               Editor
            </v-tab>
            <v-tab :to="baseRoute + 'simulator'" :disabled="!parseInfo || !parseInfo.isOk" router key="simulator">
               Simulator
            </v-tab>
         </v-tabs>

      <div>
         <router-view :moduleId="moduleId"></router-view>
      </div>
   </div>
</template>

<script>
   export default {

      props: {
         moduleId: Number,
         baseRoute: String,
      },

      data () {
         return {
            currentTab: null,
         }
      },

      computed: {
         parseInfo () {
            return this.$store.state.craps.module2parseInfo[this.moduleId]
         },
         appParams () {
            return this.$store.getters.appParams
         },
      },

      mounted: function() {
         this.$emit('userModuleUpdated', this.moduleId)
      },

      updated: function() {
         this.$emit('userModuleUpdated', this.moduleId)
      },

      methods: {
      },
   }
</script>


<style scoped>
.code-editor {
   height: 100%;
   display: flex;
   flex-direction: column;  
   justify-content: flex-start;

   align-items: stretch;
   align-content: stretch;
}

.code-editor-part {
   flex: 1;
   background: rgba(100, 0, 100, .1);
}
</style>
