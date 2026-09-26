<script setup lang="ts">
import type { Component } from 'vue';

export type TAppButtonVariant = 'primary' | 'secondary';
export type TAppButtonSize = 'standard' | 'icon';

type TProps = {
  variant?: TAppButtonVariant;
  size?: TAppButtonSize;
  icon?: Component;
};

const props = withDefaults(defineProps<TProps>(), {
  variant: 'secondary',
  size: 'standard',
  icon: undefined,
});
</script>

<template>
  <button
    type="button"
    class="app-button"
    :class="[`app-button--${props.variant}`, `app-button--size-${props.size}`]"
  >
    <component
      :is="props.icon"
      v-if="props.icon"
      class="icon"
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
  color: var(--app-text);
  border: 0;
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
  white-space: nowrap;
}

.app-button--primary {
  color: var(--app-text-inverse);
  background: var(--app-button-primary-background, var(--app-accent));
}

.app-button--primary:hover:not(:disabled) {
  filter: brightness(0.94);
}

.app-button--secondary {
  color: var(--app-text);
  background: var(--app-button-secondary-background, var(--app-background));
}

.app-button--secondary:hover:not(:disabled) {
  background: var(
    --app-button-secondary-hover-background,
    var(--app-surface-raised)
  );
}

.app-button--size-icon {
  width: var(--control-size-md);
  height: var(--control-size-md);
  padding: var(--space-2);
}

.icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  fill: var(--app-button-icon-fill, none);
  stroke-width: var(--app-button-icon-stroke-width, 2);
}

.app-button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 1px;
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
