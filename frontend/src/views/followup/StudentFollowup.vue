<template>
   <StudentActivity :user_uid="user_uid" />
   <StudentAttendance :user_uid="user_uid" />
</template>

<script setup>
import StudentActivity from '/src/views/followup/StudentActivity.vue'
import StudentAttendance from '/src/views/followup/StudentAttendance.vue'


const props = defineProps({
   user_uid: {
      type: String,
   },
})

</script>