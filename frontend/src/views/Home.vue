<template>
   <div style="display: flex; flex-direction: column; overflow: hidden; height: 100vh;">

      <NavigationBar :signedinId="signedinId"></NavigationBar>

      <router-view></router-view>

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
