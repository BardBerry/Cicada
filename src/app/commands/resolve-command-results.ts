import { EAppCommandGroup, type TResolvedCommand } from './app-command.model';

type TCommandResultSection = {
  id: EAppCommandGroup | 'search';
  label: string | null;
  commands: TResolvedCommand[];
};

const COMMAND_GROUP_LABELS: Record<EAppCommandGroup, string> = {
  [EAppCommandGroup.Recording]: 'Recording',
  [EAppCommandGroup.Playback]: 'Playback',
  [EAppCommandGroup.Navigation]: 'Navigation',
  [EAppCommandGroup.App]: 'App',
};

export function resolveCommandResults(
  commands: readonly TResolvedCommand[],
  query: string,
): TCommandResultSection[] {
  const text = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const tokens = text.split(' ');
  const ranked = commands.flatMap((command, definitionOrder) => {
    if (command.relevance === null) return [];
    const label = command.label.toLowerCase();
    const keywords = (command.keywords ?? []).join(' ').toLowerCase();
    let searchRelevance = 0;
    if (text) {
      if (label === text) searchRelevance = 4;
      else if (label.startsWith(text)) searchRelevance = 3;
      else if (
        tokens.every((token) =>
          label.split(' ').some((word) => word.startsWith(token)),
        )
      )
        searchRelevance = 2;
      else if (tokens.every((token) => `${label} ${keywords}`.includes(token)))
        searchRelevance = 1;
      else return [];
    }
    return [
      {
        command,
        relevance: command.relevance,
        searchRelevance,
        definitionOrder,
      },
    ];
  });

  const sortedCommands = ranked
    .sort(
      (left, right) =>
        right.searchRelevance - left.searchRelevance ||
        left.relevance - right.relevance ||
        Number(right.command.enabled) - Number(left.command.enabled) ||
        left.definitionOrder - right.definitionOrder,
    )
    .map(({ command }) => command);

  if (!sortedCommands.length) return [];
  if (text) return [{ id: 'search', label: null, commands: sortedCommands }];

  const groups = new Map<EAppCommandGroup, TCommandResultSection>();
  // First occurrence is the strongest command, so insertion order ranks categories.
  for (const command of sortedCommands) {
    let group = groups.get(command.group);
    if (!group) {
      group = {
        id: command.group,
        label: COMMAND_GROUP_LABELS[command.group],
        commands: [],
      };
      groups.set(command.group, group);
    }
    group.commands.push(command);
  }
  return [...groups.values()];
}
