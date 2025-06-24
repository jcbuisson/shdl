<template>
   <div class="split-container">
      <!-- Left Panel with Slot -->
      <div class="left-panel" :style="{ width: leftWidth + 'px' }">
         <slot name="left-panel"></slot>
      </div>

      <!-- Draggable Splitter -->
      <div class="splitter" @mousedown="startResize"></div>

      <!-- Right Panel with Slot -->
      <div class="right-panel" :style="{ width: `calc(100% - ${leftWidth}px)` }">
         <slot name="right-panel"></slot>
      </div>
   </div>
 </template>
 
<script setup>
import { ref } from 'vue'

const props = defineProps({
   leftWidth: {
      type: Number,
      default: 300,
   },
})

const emit = defineEmits(['resize'])

const leftWidth = ref(props.leftWidth) // Initial width of the left panel
const isResizing = ref(false)

function startResize(e) {
   isResizing.value = true
   window.addEventListener('mousemove', resize)
   window.addEventListener('mouseup', stopResize)
}

function resize(e) {
   if (isResizing.value) {
      leftWidth.value = e.clientX
   }
}

function stopResize() {
   isResizing.value = false
   emit('resize', leftWidth.value)
   window.removeEventListener('mousemove', resize)
   window.removeEventListener('mouseup', stopResize)
}
</script>
 
<style scoped>
.split-container {
   display: flex;
   width: 100%;
   height: 100%;
   position: relative;
   /* overflow: hidden; */
}

.left-panel,
.right-panel {
   height: 100%;
   overflow: auto;
}

.splitter {
   width: 3px;
   background-color: #ccc;
   cursor: col-resize;
   height: 100%;
}
.splitter:hover {
   width: 6px;
   background-color: #999;
}

.left-panel {
   background-color: #f5f5f5;
}

.right-panel {
   background-color: #e0e0e0;
}
</style>