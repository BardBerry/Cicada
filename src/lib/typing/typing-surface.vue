<script setup lang="ts">
import { ETextMutationResultStatus } from './derive-text-mutation-event';
import { resolveTextMutation } from './resolve-text-mutation';
import { ETypingEventType, type TTypingEvent } from './typing-event.model';

type TProps = {
  text: string;
};

const props = defineProps<TProps>();

const emit = defineEmits<{
  typingEvent: [event: TTypingEvent];
}>();

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
    :value="text"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    @input="handleInput"
    @keydown="handleKeydown"
  ></textarea>
</template>
