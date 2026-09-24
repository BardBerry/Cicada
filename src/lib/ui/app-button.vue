<script setup lang="ts">
import type { ButtonHTMLAttributes } from 'vue';

// Native attributes are typed here but remain runtime fallthrough attributes.
interface TProps extends /* @vue-ignore */ ButtonHTMLAttributes {
  variant?: 'default' | 'primary' | 'recording-active';
}

const props = withDefaults(defineProps<TProps>(), {
  variant: 'default',
});
</script>

<template>
  <button
    type="button"
    class="app-button"
    :class="{
      'app-button--primary': props.variant === 'primary',
      'app-button--recording-active': props.variant === 'recording-active',
    }"
  >
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  --app-button-background: var(--app-control-background);
  --app-button-hover: var(--app-control-hover);
  --app-button-pressed: var(--app-control-pressed);
  --app-button-border: var(--app-border);
  --app-button-text: var(--app-text-primary);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 16px;
  border: 1px solid var(--app-button-border);
  border-radius: var(--app-radius-control);
  background: var(--app-button-background);
  color: var(--app-button-text);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
  cursor: pointer;
}

.app-button--primary {
  --app-button-background: var(--app-primary-background);
  --app-button-hover: var(--app-primary-hover);
  --app-button-pressed: var(--app-primary-pressed);
  --app-button-border: var(--app-primary-background);
  --app-button-text: var(--app-primary-text);
}

.app-button--recording-active {
  --app-button-background: var(--app-recording-background);
  --app-button-hover: var(--app-recording-hover);
  --app-button-pressed: var(--app-recording-pressed);
  --app-button-border: var(--app-recording-border);
  --app-button-text: var(--app-recording-text);
}

@media (hover: hover) {
  .app-button:hover:not(:disabled) {
    background: var(--app-button-hover);
  }
}

.app-button:active:not(:disabled) {
  background: var(--app-button-pressed);
}

.app-button:focus-visible {
  outline: 2px solid var(--app-focus-color);
  outline-offset: 3px;
}

.app-button:disabled {
  border-color: var(--app-control-disabled-border);
  background: var(--app-control-disabled-background);
  color: var(--app-control-disabled-text);
  cursor: not-allowed;
}
</style>
