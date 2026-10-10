import type { Component } from 'vue';

import type { TShortcut } from '../keymap/keymap.model';

export enum EAppCommand {
  OpenCommandPalette = 'app.open-command-palette',
  GoToStudio = 'navigation.studio',
  GoToSettings = 'navigation.settings',

  StartRecording = 'recording.start',
  StopRecording = 'recording.stop',
  ToggleRecording = 'recording.toggle',
  NewRecording = 'recording.new',
  SaveRecording = 'recording.save',

  StartReplay = 'replay.start',
  StopReplay = 'replay.stop',
  ToggleReplay = 'replay.toggle',

  EnterZenMode = 'studio.enter-zen',
  ExitZenMode = 'studio.exit-zen',
  ToggleZenMode = 'studio.toggle-zen',

  FocusCaptionInput = 'caption-input.focus',
  BlurCaptionInput = 'caption-input.blur',
}

export enum EAppCommandGroup {
  Recording = 'recording',
  Playback = 'playback',
  Navigation = 'navigation',
  App = 'app',
}

export enum ECommandRelevance {
  ActiveOperation,
  CurrentTask,
  Local,
  Global,
}

export type TCommandDefinition = {
  id: EAppCommand;
  label: string;
  icon: Component;
  group: EAppCommandGroup;
  keywords?: readonly string[];
};

export type TCommandAvailability =
  | { enabled: true; disabledReason?: never }
  | { enabled: false; disabledReason: string };

export type TCommandEvaluation = {
  availability: TCommandAvailability;
  relevance: ECommandRelevance | null;
  shortcutFallback?: EAppCommand;
};

export type TCommandOwner<TCommand extends EAppCommand = EAppCommand> = {
  commands: readonly TCommand[];
  evaluate(command: TCommand): TCommandEvaluation;
  execute(command: TCommand): boolean;
};

export type TCommandHandler<TCommand extends EAppCommand = EAppCommand> = {
  getAvailability(command: TCommand): TCommandAvailability;
  execute(command: TCommand): boolean;
};

export type TResolvedCommand = TCommandDefinition &
  TCommandAvailability & {
    relevance: ECommandRelevance | null;
    shortcuts: readonly TShortcut[];
  };
