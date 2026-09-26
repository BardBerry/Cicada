<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { RouterView } from 'vue-router';

import AppNavigation from './app-navigation.vue';
import { useStudioUiStore } from './use-studio-ui-store';

const studioUiStore = useStudioUiStore();
const { isZenMode } = storeToRefs(studioUiStore);
</script>

<template>
  <div class="app-shell">
    <div v-if="!isZenMode" class="brand">Cicada</div>

    <AppNavigation v-if="!isZenMode" class="navigation" />

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  --shell-inset: clamp(12px, 3vw, 28px);
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--app-background);
}

.brand,
.navigation {
  position: absolute;
  z-index: var(--z-index-1);
  left: var(--shell-inset);
}

.brand {
  top: var(--shell-inset);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.04em;
  pointer-events: none;
}

.navigation {
  top: 50%;
  transform: translateY(-50%);
}

.main {
  position: relative;
  z-index: var(--z-index-0);
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
