<template>
   <h2>{{ group.name }}</h2>
   <div>
      {{ group }}
   </div>
</template>

<script setup lang="ts">

const props = defineProps({
   user_uid: {
      type: String,
   },
   group: {
      type: Object,
   },
})
</script>