<script setup lang="ts">
import { XIcon } from '@lucide/vue';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  VisuallyHidden,
} from 'reka-ui';

import UiButton from './ui-button.vue';
import { UI_LOCAL_KEYBOARD_SCOPE_ATTRS } from './ui-keyboard-scope';
import { useUiOverlayLayer } from './use-ui-overlay-layer';

defineOptions({ inheritAttrs: false });

type TProps = {
  title: string;
  heading?: boolean;
  position?: 'center' | 'top';
  padded?: boolean;
  description?: string;
  dismissible?: boolean;
  dismissOnOutside?: boolean;
};

const props = withDefaults(defineProps<TProps>(), {
  heading: true,
  position: 'center',
  padded: true,
  description: undefined,
  dismissible: true,
  dismissOnOutside: true,
});
const emit = defineEmits<{
  openFocus: [event: Event];
  closeFocus: [event: Event];
}>();
const open = defineModel<boolean>('open', { default: false });
const layerStyle = useUiOverlayLayer();

function updateOpen(value: boolean) {
  if (value || props.dismissible) open.value = value;
}

function close() {
  updateOpen(false);
}

function handleEscape(event: KeyboardEvent) {
  if (event.isComposing || !props.dismissible) event.preventDefault();
}

function handleOutside(event: Event) {
  if (!props.dismissible || !props.dismissOnOutside) event.preventDefault();
}
</script>

<template>
  <DialogRoot :open="open" @update:open="updateOpen">
    <DialogTrigger
      v-if="$slots.trigger"
      as-child
      v-bind="UI_LOCAL_KEYBOARD_SCOPE_ATTRS"
    >
      <slot name="trigger" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="overlay" :style="layerStyle" />
      <DialogContent
        class="ui-dialog"
        :class="{
          'ui-dialog--top': props.position === 'top',
          'ui-dialog--unpadded': !props.padded,
        }"
        :style="layerStyle"
        v-bind="{
          ...$attrs,
          ...UI_LOCAL_KEYBOARD_SCOPE_ATTRS,
          ...(props.description ? {} : { 'aria-describedby': undefined }),
        }"
        @escape-key-down="handleEscape"
        @pointer-down-outside="handleOutside"
        @open-auto-focus="emit('openFocus', $event)"
        @close-auto-focus="emit('closeFocus', $event)"
      >
        <header v-if="props.heading" class="header">
          <div class="heading">
            <DialogTitle class="title">{{ props.title }}</DialogTitle>
            <DialogDescription v-if="props.description" class="description">
              {{ props.description }}
            </DialogDescription>
          </div>
          <DialogClose as-child>
            <UiButton
              size="icon"
              :icon="XIcon"
              :disabled="!props.dismissible"
              aria-label="Close dialog"
            />
          </DialogClose>
        </header>
        <VisuallyHidden v-else as-child>
          <div :aria-hidden="false">
            <DialogTitle>{{ props.title }}</DialogTitle>
            <DialogDescription v-if="props.description">
              {{ props.description }}
            </DialogDescription>
          </div>
        </VisuallyHidden>
        <slot :close="close" />
        <footer v-if="$slots.actions" class="actions">
          <slot name="actions" :close="close" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 20%);
}

.ui-dialog {
  --dialog-available-height: calc(100dvh - 2 * var(--space-4));

  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(560px, calc(100vw - 2 * var(--space-4)));
  max-height: var(--dialog-available-height);
  overflow: auto;
  padding: var(--space-4);
  color: var(--app-text);
  background: var(--app-background);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}

.ui-dialog--top {
  --dialog-top-offset: clamp(var(--space-4), 20dvh, 200px);
  --dialog-available-height: calc(
    100dvh - var(--dialog-top-offset) - var(--space-4)
  );

  top: var(--dialog-top-offset);
  transform: translateX(-50%);
}

.ui-dialog--unpadded {
  /* Unpadded content owns its scroll viewport. */
  overflow: hidden;
  padding: 0;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.heading {
  min-width: 0;
}

.title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.description {
  margin: var(--space-2) 0 0;
  color: var(--app-muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
</style>
