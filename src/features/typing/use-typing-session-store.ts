import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';

import { applyTypingSessionEvent } from './apply-typing-session-event';
import { type TTypingEvent } from './typing-event.model';
import { type TTypingRecording } from './typing-recording.model';
import { type TTypingSessionState } from './typing-session.model';
import { useTypingRecording } from './use-typing-recording';
import { useTypingReplay } from './use-typing-replay';

export const useTypingSessionStore = defineStore('typing-session', () => {
  const session = reactive<TTypingSessionState>({
    text: '',
    captions: [],
  });
  const sessionRevision = ref(0);

  const lastRecording = ref<TTypingRecording | null>(null);

  const {
    isRecording,
    startRecording: startTypingRecording,
    stopRecording: stopTypingRecording,
    recordEvent,
  } = useTypingRecording();

  const {
    isReplaying,
    startReplay: startTypingReplay,
    stopReplay: stopTypingReplay,
  } = useTypingReplay();

  function applySessionEvent(event: TTypingEvent) {
    applyTypingSessionEvent({
      state: session,
      event,
    });
  }

  function handleLiveTypingEvent(event: TTypingEvent) {
    applySessionEvent(event);

    if (isRecording.value) {
      recordEvent(event);
    }
  }

  function resetSession() {
    // Preserve logical session identity when replay synchronously repopulates state.
    sessionRevision.value += 1;
    session.text = '';
    session.captions = [];
  }

  function startRecording() {
    if (isRecording.value) return;
    if (isReplaying.value) return;

    resetSession();

    startTypingRecording();
  }

  function stopRecording() {
    if (!isRecording.value) return;

    lastRecording.value = stopTypingRecording();
  }

  function startReplay() {
    if (!lastRecording.value) return;
    if (isRecording.value) return;

    resetSession();

    startTypingReplay({
      recording: lastRecording.value,
      onEvent: applySessionEvent,
    });
  }

  function stopReplay() {
    if (!isReplaying.value) return;

    stopTypingReplay();
  }

  return {
    session,
    sessionRevision,
    lastRecording,
    isRecording,
    isReplaying,
    startRecording,
    stopRecording,
    startReplay,
    stopReplay,
    handleLiveTypingEvent,
  };
});
