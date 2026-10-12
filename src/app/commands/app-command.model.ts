import type { Component } from 'vue';

import type { TShortcut } from '../keymap/keymap.model';

export enum EAppCommand {
  OpenCommandPalette = 'app.open-command-palette',
  GoToStudio = 'navigation.studio',
  GoToSettings = 'navigation.settings',

  StartRecording = 'recording.start',
  StopRecording = 'recording.stop',
  ToggleRecording = 'recording.toggle',
  RetakeRecording = 'recording.retake',
  ClearSession = 'studio.clear-session',
  DiscardDraft = 'recording.discard-draft',
  NewSession = 'recording.new-session',
  SaveRecording = 'recording.save',
  OpenRecording = 'recording.open',

  StartReplay = 'replay.start',
  StopReplay = 'replay.stop',
  ToggleReplay = 'replay.toggle',

  EnterChromaMode = 'studio.enter-chroma',
  ExitChromaMode = 'studio.exit-chroma',
  ToggleChromaMode = 'studio.toggle-chroma',

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
  ActiveOperation = 0,
  PrimaryAction = 1,
  Contextual = 2,
  Global = 3,
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
  label?: string;
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
