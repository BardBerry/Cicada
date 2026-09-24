<script setup lang="ts">
import Studio from './lib/studio/studio.vue';
</script>

<template>
  <main class="container app-theme--rose-stone">
    <Studio />
  </main>
</template>

<style scoped>
.container {
  background: var(--app-background);
  color: var(--app-text-primary);
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
