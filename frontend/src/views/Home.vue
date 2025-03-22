<template>
   <div style="display: flex; flex-direction: column; overflow: hidden; height: 100vh;">

      <NavigationBar :signedinUid="signedinUid"></NavigationBar>

      <router-view></router-view>

   </div>
</template>

<script setup>
import NavigationBar from '/src/components/NavigationBar.vue'

import { app } from '/src/client-app.js'

import { synchronizeWhereList as synchronizeUserWhereList } from '/src/use/useUser'
import { synchronizeWhereList as synchronizeGroupWhereList } from '/src/use/useGroup'
import { synchronizeWhereList as synchronizeUserTabRelationWhereList } from '/src/use/useUserTabRelation'
import { synchronizeWhereList as synchronizeUserGroupRelationWhereList } from '/src/use/useUserGroupRelation'

const props = defineProps({
   signedinUid: {
      type: String,
   },
})

// synchronize when connection starts or restarts
// (situated here because of import circularity issues)
app.addConnectListener(async () => {
   // order matters
   await synchronizeUserWhereList()
   await synchronizeGroupWhereList()
   await synchronizeUserTabRelationWhereList()
   await synchronizeUserGroupRelationWhereList()
})
</script>
