<template>
   <div class="button" :class="{ on: isOnline, off: !isOnline }" @click="onClick">
      {{ isOnline ? "ON-LINE" : "OFF-LINE" }}
   </div>
</template>


<script setup>
const props = defineProps({
   isOnline: Boolean,
})

const emit = defineEmits(['connect', 'disconnect'])

function onClick() {
   emit(props.isOnline ? 'disconnect': 'connect')
}
</script>


<style scoped>
.button {
   font-size: 14px;
   padding: 5px 15px 5px 15px;
   border-style: solid;
   border-radius: 10px;
   border-width: 0;
   text-align: center;
   cursor: pointer;
}

.button:active {
   background-color: grey;
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
