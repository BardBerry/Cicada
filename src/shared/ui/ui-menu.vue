<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui';

import { UI_LOCAL_KEYBOARD_SCOPE_ATTRS } from './ui-keyboard-scope';
import { useUiOverlayLayer } from './use-ui-overlay-layer';

defineOptions({ inheritAttrs: false });

type TProps = {
  disabled?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
};

const props = withDefaults(defineProps<TProps>(), {
  disabled: false,
  side: 'bottom',
  align: 'end',
});
const emit = defineEmits<{
  closeFocus: [event: Event];
}>();
const open = defineModel<boolean>('open', { default: false });
const layerStyle = useUiOverlayLayer();

function handleEscape(event: KeyboardEvent) {
  if (event.isComposing) event.preventDefault();
}
</script>

<template>
  <DropdownMenuRoot v-model:open="open">
    <DropdownMenuTrigger
      as-child
      :disabled="props.disabled"
      v-bind="UI_LOCAL_KEYBOARD_SCOPE_ATTRS"
    >
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="ui-menu"
        :style="layerStyle"
        :side="props.side"
        :align="props.align"
        :side-offset="6"
        v-bind="{ ...$attrs, ...UI_LOCAL_KEYBOARD_SCOPE_ATTRS }"
        @close-auto-focus="emit('closeFocus', $event)"
        @escape-key-down="handleEscape"
      >
        <slot />
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style scoped>
.ui-menu {
  min-width: 160px;
  max-width: var(--reka-dropdown-menu-content-available-width);
  max-height: var(--reka-dropdown-menu-content-available-height);
  overflow: auto;
  padding: var(--space-1);
  color: var(--app-text);
  background: var(--app-background);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}
</style>
