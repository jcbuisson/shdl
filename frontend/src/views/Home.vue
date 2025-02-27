<template>

   <NavigationBar :signedinId="signedinId"></NavigationBar>

   <router-view></router-view>

</template>

<script setup>
import NavigationBar from '/src/components/NavigationBar.vue'

const props = defineProps({
   signedinId: {
      type: String,
   },
})
</script>
