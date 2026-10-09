import { EAppCommandGroup, type TResolvedCommand } from './app-command.model';

const COMMAND_GROUPS = [
  { id: EAppCommandGroup.Recording, label: 'Recording' },
  { id: EAppCommandGroup.Playback, label: 'Playback' },
  { id: EAppCommandGroup.Navigation, label: 'Navigation' },
  { id: EAppCommandGroup.App, label: 'App' },
];

export function resolveCommandResults(
  commands: readonly TResolvedCommand[],
  query: string,
) {
  const text = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const tokens = text.split(' ');
  const ranked = commands.flatMap((command) => {
    const label = command.label.toLowerCase();
    const keywords = (command.keywords ?? []).join(' ').toLowerCase();
    let relevance = 0;
    if (text) {
      if (label === text) relevance = 4;
      else if (label.startsWith(text)) relevance = 3;
      else if (
        tokens.every((token) =>
          label.split(' ').some((word) => word.startsWith(token)),
        )
      )
        relevance = 2;
      else if (tokens.every((token) => `${label} ${keywords}`.includes(token)))
        relevance = 1;
      else return [];
    }
    return [{ command, relevance }];
  });

  return COMMAND_GROUPS.flatMap((group) => {
    const matches = ranked.filter(({ command }) => command.group === group.id);
    if (!matches.length) return [];
    matches.sort(
      (left, right) =>
        right.relevance - left.relevance ||
        Number(right.command.enabled) - Number(left.command.enabled) ||
        right.command.priority - left.command.priority,
    );
    return [
      {
        ...group,
        relevance: matches[0].relevance,
        commands: matches.map(({ command }) => command),
      },
    ];
  }).sort((left, right) => right.relevance - left.relevance);
}
