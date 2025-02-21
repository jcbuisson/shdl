import { createApp } from 'vue'
// import './style.css'
import '@mdi/font/css/materialdesignicons.css'
import App from './App.vue'
import router from './router'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
   components,
   directives,
})
 
createApp(App)
   .use(vuetify)
   .use(router)
   .mount('#app')
   