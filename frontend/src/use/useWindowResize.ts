import { ref, onMounted } from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'


export function useWindowResize() {
   const width = ref(window.innerWidth)
   const height = ref(window.innerHeight)

   const update = () => {
      width.value = window.innerWidth
      height.value = window.innerHeight
   }

   onMounted(() => {
      window.addEventListener('resize', update)
   })

   // Automatically clean up when the component using this composable unmounts
   tryOnScopeDispose(() => {
      window.removeEventListener('resize', update)
      console.log('Removed resize listener')
   })

   return { width, height }
}
