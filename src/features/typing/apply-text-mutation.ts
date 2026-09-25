import {
  ETypingEventType,
  type TTextMutationEvent,
} from './typing-event.model';

type TApplyTextMutationParams = {
  text: string;
  event: TTextMutationEvent;
};

export function applyTextMutation({
  text,
  event,
}: TApplyTextMutationParams): string {
  switch (event.type) {
    case ETypingEventType.Insert:
      return text + event.text;
    case ETypingEventType.Delete:
      return text.slice(0, -event.count);
  }
}
