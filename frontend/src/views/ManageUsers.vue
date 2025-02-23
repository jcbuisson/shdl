<template>
   <v-card max-width="300">
      <v-toolbar color="red-darken-4" density="compact">
         <v-btn icon="mdi-magnify" variant="text"></v-btn>
         <v-text-field v-model="filter" single-line></v-text-field>
         <v-btn icon="mdi-plus" variant="text"></v-btn>
      </v-toolbar>
   
      <v-list lines="three"
         :items="items"
         item-props
      >
         <template v-slot:subtitle="{ subtitle }">
            <!-- <div v-html="subtitle"></div> -->
            <v-chip size="small">1SN24D</v-chip>
         </template>
      </v-list>
   </v-card>
 </template>


<script setup>
import { ref } from 'vue'

import { userOfId } from '/src/use/useUser.js'

const props = defineProps({
   userid: {
      type: String,
   },
})

const signedinUser = userOfId.value(parseInt(props.userid))

const filter = ref('')
const items = ref([
   { type: 'subheader', title: 'Today' },
   {
      prependAvatar: signedinUser?.value?.pict,
      title: signedinUser?.value?.lastname,
      subtitle: `<span class="text-primary">Ali Connors</span> &mdash; I'll be in your neighborhood doing errands this weekend. Do you want to hang out?`,
   },
   { type: 'divider', inset: true },
   {
      prependAvatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
      title: 'Summer BBQ',
      subtitle: `<span class="text-primary">to Alex, Scott, Jennifer</span> &mdash; Wish I could come, but I'm out of town this weekend.`,
   },
   { type: 'divider', inset: true },
   {
      prependAvatar: 'https://cdn.vuetifyjs.com/images/lists/3.jpg',
      title: 'Oui oui',
      subtitle: '<span class="text-primary">Sandra Adams</span> &mdash; Do you have Paris recommendations? Have you ever been?',
   },
   { type: 'divider', inset: true },
   {
      prependAvatar: 'https://cdn.vuetifyjs.com/images/lists/4.jpg',
      title: 'Birthday gift',
      subtitle: '<span class="text-primary">Trevor Hansen</span> &mdash; Have any ideas about what we should get Heidi for her birthday?',
   },
   { type: 'divider', inset: true },
   {
      prependAvatar: 'https://cdn.vuetifyjs.com/images/lists/5.jpg',
      title: 'Recipe to try',
      subtitle: '<span class="text-primary">Britta Holt</span> &mdash; We should eat this: Grate, Squash, Corn, and tomatillo Tacos.',
   },
])
</script>