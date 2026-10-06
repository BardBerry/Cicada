<script setup lang="ts">
import { DropdownMenuItem } from 'reka-ui';

type TProps = {
  disabled?: boolean;
};

const props = withDefaults(defineProps<TProps>(), {
  disabled: false,
});
const emit = defineEmits<{
  select: [event: Event];
}>();
</script>

<template>
  <DropdownMenuItem
    class="ui-menu-item"
    :disabled="props.disabled"
    @select="emit('select', $event)"
  >
    <slot />
  </DropdownMenuItem>
</template>

<style scoped>
.ui-menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: default;
}

.ui-menu-item[data-highlighted] {
  background: var(--app-surface-raised);
}

.ui-menu-item[data-disabled] {
  opacity: 0.45;
}
</style>
