import type { Component } from 'vue';

import type { TShortcut } from '../keymap/keymap.model';

export enum EAppCommand {
  OpenCommandPalette = 'app.open-command-palette',
  GoToStudio = 'navigation.studio',
  GoToSettings = 'navigation.settings',

  StartRecording = 'recording.start',
  StopRecording = 'recording.stop',
  NewRecording = 'recording.new',
  SaveRecording = 'recording.save',

  StartReplay = 'replay.start',
  StopReplay = 'replay.stop',

  EnterZenMode = 'studio.enter-zen',
  ExitZenMode = 'studio.exit-zen',

  FocusCaptionInput = 'caption-input.focus',
  BlurCaptionInput = 'caption-input.blur',
}

export enum EAppCommandGroup {
  Recording = 'recording',
  Playback = 'playback',
  Navigation = 'navigation',
  App = 'app',
}

export type TCommandDefinition = {
  id: EAppCommand;
  label: string;
  icon: Component;
  group: EAppCommandGroup;
  priority: number;
  keywords?: readonly string[];
};

export type TCommandAvailability =
  | { enabled: true; disabledReason?: never }
  | { enabled: false; disabledReason: string };

export type TCommandHandler<TCommand extends EAppCommand = EAppCommand> = {
  getAvailability(command: TCommand): TCommandAvailability;
  execute(command: TCommand): boolean;
};

export type TResolvedCommand = TCommandDefinition &
  TCommandAvailability & { shortcuts: readonly TShortcut[] };
