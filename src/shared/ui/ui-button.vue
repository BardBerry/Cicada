<script setup lang="ts">
import type { Component } from 'vue';

export type TUiButtonVariant = 'primary' | 'secondary';
export type TUiButtonSize = 'standard' | 'icon';

type TProps = {
  variant?: TUiButtonVariant;
  size?: TUiButtonSize;
  controlSize?: 'sm' | 'md';
  type?: 'button' | 'submit' | 'reset';
  icon?: Component;
};

const props = withDefaults(defineProps<TProps>(), {
  variant: 'secondary',
  size: 'standard',
  controlSize: 'md',
  type: 'button',
  icon: undefined,
});
</script>

<template>
  <button
    :type="props.type"
    class="ui-button"
    :class="[
      `ui-button--${props.variant}`,
      `ui-button--size-${props.size}`,
      `ui-button--control-${props.controlSize}`,
    ]"
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
.ui-button {
  --ui-button-control-size: var(--control-size-md);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--ui-button-control-size);
  padding: var(--space-3) var(--space-4);
  color: var(--app-text);
  border: 0;
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
  white-space: nowrap;
}

.ui-button--primary {
  color: var(--app-text-inverse);
  background: var(--ui-button-primary-background, var(--app-accent));
}

.ui-button--primary:hover:not(:disabled) {
  filter: brightness(0.94);
}

.ui-button--secondary {
  color: var(--app-text);
  background: var(--ui-button-secondary-background, var(--app-background));
}

.ui-button--secondary:hover:not(:disabled) {
  background: var(
    --ui-button-secondary-hover-background,
    var(--app-surface-raised)
  );
}

.ui-button--control-sm {
  --ui-button-control-size: var(--control-size-sm);
  padding: var(--space-2) var(--space-3);
}

.ui-button--size-icon {
  width: var(--ui-button-control-size);
  height: var(--ui-button-control-size);
  padding: var(--space-2);
}

.icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  fill: var(--ui-button-icon-fill, none);
  stroke-width: var(--ui-button-icon-stroke-width, 2);
}

.ui-button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 1px;
}

.ui-button:disabled {
  opacity: 0.45;
}

@media (max-width: 480px) {
  .ui-button--size-standard {
    padding-inline: var(--space-2);
  }
}
</style>
