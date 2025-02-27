<template>
   <div style="display: flex; flex-direction: column; height: 100vh;">
      <NavigationBar :signedinId="signedinId"></NavigationBar>

      <router-view style="flex-grow: 4;"></router-view>
   </div>
</template>

<script setup>
import NavigationBar from '/src/components/NavigationBar.vue'

const props = defineProps({
   signedinId: {
      type: String,
   },
})
</script>
