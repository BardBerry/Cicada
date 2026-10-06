<script setup lang="ts">
import { ref } from 'vue';

import { UI_APPLICATION_KEYBOARD_SCOPE_ATTRS } from '@/shared/ui/ui-keyboard-scope';

import { ETextMutationResultStatus } from './derive-text-mutation-event';
import { resolveTextMutation } from './resolve-text-mutation';
import { ETypingEventType, type TTypingEvent } from './typing-event.model';

type TProps = {
  text: string;
  disabled: boolean;
};

const props = defineProps<TProps>();

const emit = defineEmits<{
  typingEvent: [event: TTypingEvent];
  focus: [];
  blur: [];
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);

function focus() {
  textarea.value?.focus();
}

function blur() {
  textarea.value?.blur();
}

defineExpose({
  focus,
  blur,
});

function handleInput(event: Event) {
  const target = event.currentTarget as HTMLTextAreaElement;

  const result = resolveTextMutation({
    currentText: props.text,
    attemptedText: target.value,
  });

  if (target.value !== result.resolvedText) {
    target.value = result.resolvedText;
  }

  if (result.status === ETextMutationResultStatus.Success) {
    emit('typingEvent', result.event);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.key !== 'Enter') return;

  event.preventDefault();

  if (!props.text) return;

  emit('typingEvent', {
    type: ETypingEventType.Commit,
  });
}
</script>

<template>
  <textarea
    ref="textarea"
    class="typing-surface"
    aria-label="Type a caption"
    v-bind="UI_APPLICATION_KEYBOARD_SCOPE_ATTRS"
    :value="props.text"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    :disabled="props.disabled"
    @input="handleInput"
    @keydown="handleKeydown"
    @focus="emit('focus')"
    @blur="emit('blur')"
  ></textarea>
</template>

<style scoped>
.typing-surface {
  position: absolute;
  inset: 0;
  z-index: var(--z-index-1);

  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;

  border: 0;
  outline: 0;
  resize: none;

  opacity: 0;
  cursor: default;
}

.typing-surface:disabled {
  pointer-events: none;
}
</style>
