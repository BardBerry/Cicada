<script setup lang="ts">
import type { Component } from 'vue';

type TProps = {
  variant?: 'standard' | 'primary' | 'recording' | 'replaying';
  size?: 'standard' | 'icon';
  icon?: Component;
};

const props = withDefaults(defineProps<TProps>(), {
  variant: 'standard',
  size: 'standard',
  icon: undefined,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <button
    type="button"
    class="app-button"
    :class="[`app-button--${props.variant}`, `app-button--size-${props.size}`]"
    @click="emit('click', $event)"
  >
    <component
      :is="props.icon"
      v-if="props.icon"
      class="app-button__icon"
      aria-hidden="true"
      focusable="false"
    />
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--control-size-md);
  padding: var(--space-3) var(--space-4);
  background: white;
  color: var(--app-text);
  border: 0px solid var(--app-border);
  border-radius: var(--radius-sm);
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.app-button--standard:hover:not(:disabled) {
  background: var(--app-accent-soft);
}

.app-button--primary {
  background: var(--app-accent);
  color: var(--app-text-inverse);
  border-color: var(--app-accent);
}

.app-button--recording {
  background: var(--app-recording);
  color: var(--app-text-inverse);
  border-color: var(--app-recording);
}

.app-button--replaying {
  background: var(--app-accent);
  color: var(--app-text-inverse);
  border-color: var(--app-accent);
}

.app-button--size-icon {
  width: var(--control-size-md);
  height: var(--control-size-md);
  padding: var(--space-2);
}

.app-button__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.app-button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}

.app-button:disabled {
  opacity: 0.45;
}

@media (max-width: 480px) {
  .app-button--size-standard {
    padding-inline: var(--space-2);
  }
}
</style>
