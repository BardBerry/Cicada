<script setup lang="ts">
import { ref } from 'vue';
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
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);

function focus() {
  textarea.value?.focus();
}

defineExpose({
  focus,
});

function handleInput(event: Event) {
  const textarea = event.currentTarget as HTMLTextAreaElement;

  const result = resolveTextMutation({
    currentText: props.text,
    attemptedText: textarea.value,
  });

  if (textarea.value !== result.resolvedText) {
    textarea.value = result.resolvedText;
  }

  if (result.status === ETextMutationResultStatus.Success) {
    emit('typingEvent', result.event);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return;

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
    :value="text"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    :disabled="disabled"
    @input="handleInput"
    @keydown="handleKeydown"
  ></textarea>
</template>
