import {
  CircleIcon,
  MaximizeIcon,
  MinimizeIcon,
  PanelsTopLeftIcon,
  PlayIcon,
  PlusIcon,
  SaveIcon,
  Settings2Icon,
  SquareIcon,
} from '@lucide/vue';

import {
  EAppCommand,
  EAppCommandGroup,
  type TCommandDefinition,
} from './app-command.model';

export const COMMAND_DEFINITIONS: readonly TCommandDefinition[] = [
  {
    id: EAppCommand.StartRecording,
    label: 'Start Recording',
    icon: CircleIcon,
    group: EAppCommandGroup.Recording,
    keywords: ['record', 'retake', 'capture'],
  },
  {
    id: EAppCommand.StopRecording,
    label: 'Stop Recording',
    icon: SquareIcon,
    group: EAppCommandGroup.Recording,
    keywords: ['finish', 'capture'],
  },
  {
    id: EAppCommand.SaveRecording,
    label: 'Save Recording',
    icon: SaveIcon,
    group: EAppCommandGroup.Recording,
    keywords: ['retry', 'draft'],
  },
  {
    id: EAppCommand.NewRecording,
    label: 'New Recording',
    icon: PlusIcon,
    group: EAppCommandGroup.Recording,
    keywords: ['clear', 'reset', 'workspace'],
  },
  {
    id: EAppCommand.StartReplay,
    label: 'Replay Recording',
    icon: PlayIcon,
    group: EAppCommandGroup.Playback,
    keywords: ['play', 'restart'],
  },
  {
    id: EAppCommand.StopReplay,
    label: 'Stop Replay',
    icon: SquareIcon,
    group: EAppCommandGroup.Playback,
    keywords: ['playback'],
  },
  {
    id: EAppCommand.GoToStudio,
    label: 'Go to Studio',
    icon: PanelsTopLeftIcon,
    group: EAppCommandGroup.Navigation,
    keywords: ['workspace'],
  },
  {
    id: EAppCommand.GoToSettings,
    label: 'Go to Settings',
    icon: Settings2Icon,
    group: EAppCommandGroup.Navigation,
    keywords: ['preferences'],
  },
  {
    id: EAppCommand.EnterZenMode,
    label: 'Enter Zen Mode',
    icon: MaximizeIcon,
    group: EAppCommandGroup.App,
    keywords: ['hide', 'chrome'],
  },
  {
    id: EAppCommand.ExitZenMode,
    label: 'Exit Zen Mode',
    icon: MinimizeIcon,
    group: EAppCommandGroup.App,
    keywords: ['show', 'chrome'],
  },
];
