export enum EAppCommand {
  StartRecording = 'recording.start',
  StopRecording = 'recording.stop',

  StartReplay = 'replay.start',
  StopReplay = 'replay.stop',

  EnterCaptureMode = 'studio.enter-capture',
  ExitCaptureMode = 'studio.exit-capture',

  FocusCaptionStage = 'caption-stage.focus',
  BlurCaptionStage = 'caption-stage.blur',
}
