<template>
   <a :href="url" target="_blank" class="github">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
         <path fill="currentColor" :d="svgPath"/>
      </svg>
   </a>
</template>

<script setup>
const props = defineProps({
   url: String,
   svgPath: String,
})
</script>

<style scoped>
.github {
  color: black;
  width: 2rem /* 32px */;
  height: 2rem /* 32px */;
}
</style>