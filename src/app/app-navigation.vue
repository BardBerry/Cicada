<script setup lang="ts">
import { PanelsTopLeftIcon, Settings2Icon } from '@lucide/vue';
import { RouterLink, useRoute } from 'vue-router';

import { EAppRouteName } from './router/app-route.model';

const route = useRoute();

const destinations = [
  { name: EAppRouteName.Studio, label: 'Studio', icon: PanelsTopLeftIcon },
  { name: EAppRouteName.Settings, label: 'Settings', icon: Settings2Icon },
];
</script>

<template>
  <nav class="app-navigation" aria-label="Application">
    <div
      v-for="destination in destinations"
      :key="destination.name"
      class="item"
    >
      <RouterLink
        :to="{ name: destination.name }"
        :aria-label="destination.label"
        class="link"
        :class="{
          'link--active': route.name === destination.name,
        }"
      >
        <component
          :is="destination.icon"
          class="icon"
          aria-hidden="true"
          focusable="false"
        />
      </RouterLink>
      <span class="tooltip" aria-hidden="true">
        {{ destination.label }}
      </span>
    </div>
  </nav>
</template>

<style scoped>
.app-navigation {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--app-background);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}

.item {
  position: relative;
}

.link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--control-size-md);
  height: var(--control-size-md);
  color: var(--app-text);
  background: transparent;
  border-radius: var(--radius-sm);
  text-decoration: none;
}

.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.link:hover {
  background: var(--app-surface-raised);
}

.link--active {
  color: var(--app-accent);
  background: var(--app-accent-soft);
}

.link--active:hover {
  background: var(--app-accent-soft);
}

.link:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 1px;
}

.tooltip {
  position: absolute;
  top: 50%;
  left: calc(100% + 18px);
  transform: translateY(-50%);
  padding: var(--space-1) var(--space-2);
  color: var(--app-text);
  background: var(--app-surface-raised);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-sm);
  visibility: hidden;
  pointer-events: none;
}

.link:hover + .tooltip,
.link:focus-visible + .tooltip {
  visibility: visible;
}
</style>
