import { reactive, ref } from 'vue';
import { type TTypingRecording } from '../recording/typing-recording.model';
import { useTypingRecording } from '../recording/use-typing-recording';
import { type TTypingEvent } from '../typing/typing-event.model';
import {
  applyTypingSessionEvent,
  type TTypingSessionState,
} from './typing-session-state';
import { useTypingReplay } from '../replay/use-typing-replay';

export function useTypingSession() {
  const session = reactive<TTypingSessionState>({
    text: '',
    captions: [],
  });

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
    lastRecording,
    isRecording,
    isReplaying,
    startRecording,
    stopRecording,
    startReplay,
    stopReplay,
    handleLiveTypingEvent,
  };
}
