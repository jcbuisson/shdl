<template>
   <v-container fluid>
     <v-row>
       <v-col>
         <div class="split-container">
           <!-- Left Panel with Slot -->
           <div class="left-panel" :style="{ width: leftWidth + 'px' }">
             <slot name="left-panel">
               <!-- Default content if no slot is provided -->
               <v-card>
                 <v-card-title>Left Panel</v-card-title>
                 <v-card-text>This is the default left panel content.</v-card-text>
               </v-card>
             </slot>
           </div>
 
           <!-- Draggable Splitter -->
           <div class="splitter" @mousedown="startResize"></div>
 
           <!-- Right Panel with Slot -->
           <div class="right-panel" :style="{ width: `calc(100% - ${leftWidth}px)` }">
             <slot name="right-panel">
               <!-- Default content if no slot is provided -->
               <v-card>
                 <v-card-title>Right Panel</v-card-title>
                 <v-card-text>This is the default right panel content.</v-card-text>
               </v-card>
             </slot>
           </div>
         </div>
       </v-col>
     </v-row>
   </v-container>
 </template>
 
 <script>
 export default {
   data() {
     return {
       leftWidth: 300, // Initial width of the left panel
       isResizing: false,
     };
   },
   methods: {
     startResize(e) {
       this.isResizing = true;
       window.addEventListener('mousemove', this.resize);
       window.addEventListener('mouseup', this.stopResize);
     },
     resize(e) {
       if (this.isResizing) {
         this.leftWidth = e.clientX;
       }
     },
     stopResize() {
       this.isResizing = false;
       window.removeEventListener('mousemove', this.resize);
       window.removeEventListener('mouseup', this.stopResize);
     },
   },
 };
 </script>
 
 <style scoped>
 .split-container {
   display: flex;
   width: 100%;
   height: 500px; /* Adjust height as needed */
   position: relative;
 }
 
 .left-panel,
 .right-panel {
   height: 100%;
   overflow: auto;
 }
 
 .splitter {
   width: 8px;
   background-color: #ccc;
   cursor: col-resize;
   height: 100%;
 }
 
 .left-panel {
   background-color: #f5f5f5;
 }
 
 .right-panel {
   background-color: #e0e0e0;
 }
 </style>