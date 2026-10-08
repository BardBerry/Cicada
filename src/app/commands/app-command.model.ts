export enum EAppCommand {
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
