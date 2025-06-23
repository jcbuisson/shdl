<template>
   <div>{{ grade }}</div>
</template>

<script setup lang="ts">
import { useObservable } from "@vueuse/rxjs"

import { userGrade$ } from '/src/lib/businessObservables'


const props = defineProps({
   user_uid: {
      type: String,
   },
})

const grade = useObservable(userGrade$(props.user_uid))

</script>
