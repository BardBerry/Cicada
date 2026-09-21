import { fixDoubleSpacePeriod } from './fix-double-space-period';

export type TTextMutationFixerParams = {
  before: string;
  after: string;
};

export type TTextMutationFixer = (
  params: TTextMutationFixerParams,
) => string | null;

const fixers: TTextMutationFixer[] = [fixDoubleSpacePeriod];

export function normalizeTextMutation(
  params: TTextMutationFixerParams,
): string | null {
  for (const fixer of fixers) {
    const fixedAfter = fixer(params);

    if (fixedAfter !== null) {
      return fixedAfter;
    }
  }

  return null;
}
