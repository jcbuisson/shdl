<template>
   <SplitPanel :leftWidth="500">
      <!-- editor -->
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <div class="d-flex flex-column fill-height">
            <!-- Fills remaining vertical space -->
            <EditSHDLDocument :signedinUid="signedinUid" :user_uid="user_uid" :document_uid="document_uid"></EditSHDLDocument>
         </div>
      </template>

      <!-- simulator -->
      <template v-slot:right-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <div class="d-flex flex-column fill-height">
            <!-- Fills remaining vertical space -->
            <router-view name="simulator"></router-view>
         </div>
      </template>
   </SplitPanel>
</template>

<script setup>
import SplitPanel from '/src/components/SplitPanel.vue'

import EditSHDLDocument from '/src/components/EditSHDLDocument.vue'

const props = defineProps({
   signedinUid: String,
   user_uid: String,
   document_uid: String,
})

</script>