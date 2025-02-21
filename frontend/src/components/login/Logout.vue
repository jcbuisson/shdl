<template>
</template>

<script>
   import router from '@/router'

   export default {
      name: 'logout',

      mounted () {
         // commit event to vuex store
         this.$store.commit('RESET_STATE')
         // emit 'onLogout' event to App parent component
         this.$emit('onLogout')
         // go to default route
         router.push('/')
      }
   }
</script>
