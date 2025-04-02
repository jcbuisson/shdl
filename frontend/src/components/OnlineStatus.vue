<template>
   <div class="offline" :class="{ on: isOnline, off: !isOnline }">
      {{ isOnline ? "ON-LINE" : "OFF-LINE" }}
   </div>
</template>


<script setup>
const props = defineProps({
   isOnline: Boolean,
})
</script>


<style scoped>
.offline {
   font-size: 14px;
   padding: 5px 15px 5px 15px;
   border-style: solid;
   border-radius: 10px;
   border-width: 0;
   text-align: center;
}

.off {
   color: white;
   background-color: rgb(236, 139, 139);
}
.on {
   color: white;
   background-color: #54daa0;
}
</style>
