<script setup lang="ts">
import { useTemplateRef } from 'vue';

type TProps = {
  type?: 'text' | 'search';
};

const props = withDefaults(defineProps<TProps>(), {
  type: 'text',
});
const model = defineModel<string>({ default: '' });
const input = useTemplateRef('input');

function focus() {
  input.value?.focus();
}

defineExpose({ focus });
</script>

<template>
  <input ref="input" v-model="model" class="ui-input" :type="props.type" />
</template>

<style scoped>
.ui-input {
  width: 100%;
  min-width: 0;
  min-height: var(--control-size-md);
  padding: var(--space-2) var(--space-3);
  color: var(--app-text);
  background: var(--app-background);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-sm);
}

.ui-input:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 1px;
}

.ui-input:disabled {
  opacity: 0.45;
}
</style>
