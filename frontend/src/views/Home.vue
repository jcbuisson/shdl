<template>

   <NavigationBar :userid="userid"></NavigationBar>

   <router-view></router-view>

</template>

<script setup>
import NavigationBar from '/src/components/NavigationBar.vue'

const props = defineProps({
   userid: {
      type: String,
   },
})
</script>
