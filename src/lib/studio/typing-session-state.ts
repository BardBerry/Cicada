import { applyTextMutation } from '../typing/apply-text-mutation';
import {
  ETypingEventType,
  type TTypingEvent,
} from '../typing/typing-event.model';

export type TTypingSessionState = {
  text: string;
  captions: string[];
};

type TApplyTypingSessionEventParams = {
  state: TTypingSessionState;
  event: TTypingEvent;
};

export function applyTypingSessionEvent({
  state,
  event,
}: TApplyTypingSessionEventParams) {
  switch (event.type) {
    case ETypingEventType.Commit:
      state.captions.push(state.text);
      state.text = '';
      break;

    case ETypingEventType.Insert:
    case ETypingEventType.Delete:
      state.text = applyTextMutation({
        text: state.text,
        event,
      });
  }
}
