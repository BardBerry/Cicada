import {
  ETypingEventType,
  type TTextMutationEvent,
} from './typing-event.model';

type TDeriveTextMutationEventParams = {
  before: string;
  after: string;
};

export enum ETextMutationResultStatus {
  Success = 'success',
  Unsupported = 'unsupported',
  Unchanged = 'unchanged',
}

type TTextMutationResult =
  | {
      status: ETextMutationResultStatus.Success;
      event: TTextMutationEvent;
    }
  | {
      status: ETextMutationResultStatus.Unsupported;
      event: null;
    }
  | {
      status: ETextMutationResultStatus.Unchanged;
      event: null;
    };

// Interpret an exact before/after change as a tail-only text mutation.
export function deriveTextMutationEvent({
  before,
  after,
}: TDeriveTextMutationEventParams): TTextMutationResult {
  if (before === after)
    return { status: ETextMutationResultStatus.Unchanged, event: null };

  if (after.startsWith(before)) {
    return {
      status: ETextMutationResultStatus.Success,
      event: {
        type: ETypingEventType.Insert,
        text: after.slice(before.length),
      },
    };
  }

  if (before.startsWith(after)) {
    return {
      status: ETextMutationResultStatus.Success,
      event: {
        type: ETypingEventType.Delete,
        count: before.length - after.length,
      },
    };
  }

  return { status: ETextMutationResultStatus.Unsupported, event: null };
}
