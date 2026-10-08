import { applyTypingSessionEvent } from './apply-typing-session-event';
import type { TTypingRecording } from './typing-recording.model';
import type { TTypingSessionState } from './typing-session.model';

export function reduceTypingRecording(
  recording: TTypingRecording,
): TTypingSessionState {
  const state: TTypingSessionState = { text: '', captions: [] };

  for (const { event } of recording.events) {
    applyTypingSessionEvent({ state, event });
  }

  return state;
}
