<script setup lang="ts">
import { CheckIcon, ChevronDownIcon } from '@lucide/vue';
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui';

import { UI_LOCAL_KEYBOARD_SCOPE_ATTRS } from './ui-keyboard-scope';
import { useUiOverlayLayer } from './use-ui-overlay-layer';

defineOptions({ inheritAttrs: false });

type TProps = {
  id?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
};

const props = defineProps<TProps>();
const model = defineModel<string>({ default: '' });
const layerStyle = useUiOverlayLayer();

function handleEscape(event: KeyboardEvent) {
  if (event.isComposing) event.preventDefault();
}
</script>

<template>
  <SelectRoot v-model="model" :disabled="props.disabled">
    <SelectTrigger
      class="ui-select"
      v-bind="{
        ...$attrs,
        ...UI_LOCAL_KEYBOARD_SCOPE_ATTRS,
        id: props.id,
        'aria-label': props.ariaLabel,
        'aria-labelledby': props.ariaLabelledby,
        'aria-describedby': props.ariaDescribedby,
      }"
    >
      <SelectValue class="value" :placeholder="props.placeholder" />
      <SelectIcon as-child>
        <ChevronDownIcon class="icon" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <!-- Own the stacking context instead of relying on Reka's cached z-index. -->
      <div class="popup-layer" :style="layerStyle">
        <SelectContent
          class="popup"
          position="popper"
          side="bottom"
          align="start"
          :side-offset="6"
          v-bind="UI_LOCAL_KEYBOARD_SCOPE_ATTRS"
          @escape-key-down="handleEscape"
        >
          <SelectViewport class="viewport">
            <SelectItem
              v-for="option in props.options"
              :key="option.value"
              class="item"
              :value="option.value"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
              <SelectItemIndicator class="indicator">
                <CheckIcon class="icon" />
              </SelectItemIndicator>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </div>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
.ui-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
  min-height: var(--control-size-md);
  padding: var(--space-2) var(--space-3);
  color: var(--app-text);
  text-align: left;
  background: var(--app-background);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-sm);
}

.ui-select:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 1px;
}

.ui-select:disabled {
  opacity: 0.45;
}

.ui-select[data-placeholder] {
  color: var(--app-muted);
}

.value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.popup-layer {
  position: relative;
}

:deep(.popup) {
  display: flex;
  flex-direction: column;
  width: var(--reka-select-trigger-width);
  max-width: var(--reka-select-content-available-width);
  max-height: var(--reka-select-content-available-height);
  overflow: hidden;
  color: var(--app-text);
  background: var(--app-background);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}

:deep(.viewport) {
  padding: var(--space-1);
}

.item {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--space-2) calc(var(--space-3) + 16px + var(--space-2))
    var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: default;
}

.item[data-highlighted] {
  background: var(--app-surface-raised);
}

.indicator {
  position: absolute;
  right: var(--space-3);
  display: flex;
  align-items: center;
}
</style>
