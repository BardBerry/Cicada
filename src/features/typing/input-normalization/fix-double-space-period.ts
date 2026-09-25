import type { TTextMutationFixerParams } from './normalize-text-mutation';

export function fixDoubleSpacePeriod({
  before,
  after,
}: TTextMutationFixerParams): string | null {
  if (!before.endsWith(' ')) return null;

  const doubleSpaceReplacement = `${before.slice(0, -1)}. `;

  if (after !== doubleSpaceReplacement) return null;

  return `${before} `;
}
