import { createRouter, createWebHistory } from 'vue-router';

import Settings from '@/pages/settings/settings.vue';
import Studio from '@/pages/studio/studio.vue';

import { EAppRouteName } from './app-route.model';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: EAppRouteName.Studio },
    },
    {
      path: '/studio',
      name: EAppRouteName.Studio,
      component: Studio,
    },
    {
      path: '/settings',
      name: EAppRouteName.Settings,
      component: Settings,
    },
  ],
});
