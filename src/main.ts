import './assets/styles/main.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import { router } from '@/app/router/router';

import App from './app.vue';

const app = createApp(App);
const pinia = createPinia();

app.use(router);
app.use(pinia);

app.mount('#app');
