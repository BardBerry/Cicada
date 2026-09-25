import {
  deriveTextMutationEvent,
  ETextMutationResultStatus,
} from './derive-text-mutation-event';
import { normalizeTextMutation } from './input-normalization/normalize-text-mutation';
import { type TTextMutationEvent } from './typing-event.model';

type TResolveTextMutationParams = {
  currentText: string;
  attemptedText: string;
};

type TResolvedTextMutation =
  | {
      status: ETextMutationResultStatus.Success;
      event: TTextMutationEvent;
      resolvedText: string;
    }
  | {
      status: ETextMutationResultStatus.Unsupported;
      event: null;
      resolvedText: string;
    }
  | {
      status: ETextMutationResultStatus.Unchanged;
      event: null;
      resolvedText: string;
    };

// Accept, normalize, or reject an attempted edit and return the accepted text.
export function resolveTextMutation({
  currentText,
  attemptedText,
}: TResolveTextMutationParams): TResolvedTextMutation {
  const result = deriveTextMutationEvent({
    before: currentText,
    after: attemptedText,
  });

  if (result.status !== ETextMutationResultStatus.Unsupported) {
    return {
      ...result,
      resolvedText: attemptedText,
    };
  }

  const normalizedText = normalizeTextMutation({
    before: currentText,
    after: attemptedText,
  });

  if (normalizedText === null) {
    return {
      status: ETextMutationResultStatus.Unsupported,
      event: null,
      resolvedText: currentText,
    };
  }

  const normalizedResult = deriveTextMutationEvent({
    before: currentText,
    after: normalizedText,
  });

  if (normalizedResult.status === ETextMutationResultStatus.Unsupported) {
    return {
      status: ETextMutationResultStatus.Unsupported,
      event: null,
      resolvedText: currentText,
    };
  }

  return {
    ...normalizedResult,
    resolvedText: normalizedText,
  };
}
