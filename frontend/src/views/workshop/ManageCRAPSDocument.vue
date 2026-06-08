<template>
   <SplitPanel :leftWidth="500">
      <template v-slot:left-panel>
         <div class="d-flex flex-column fill-height">
            <router-view name="editor"></router-view>
         </div>
      </template>

      <template v-slot:right-panel>
         <div class="d-flex flex-column fill-height">
            <router-view name="simulator"></router-view>
         </div>
      </template>
   </SplitPanel>
</template>

<script setup>
import SplitPanel from '/src/components/SplitPanel.vue'
</script>
