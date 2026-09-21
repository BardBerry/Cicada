export enum ETypingEventType {
  Insert = 'insert',
  Delete = 'delete',
  Commit = 'commit',
}

export type TInsertEvent = {
  type: ETypingEventType.Insert;
  text: string;
};

export type TDeleteEvent = {
  type: ETypingEventType.Delete;
  count: number;
};

export type TCommitEvent = {
  type: ETypingEventType.Commit;
};

export type TTextMutationEvent = TInsertEvent | TDeleteEvent;
export type TTypingEvent = TTextMutationEvent | TCommitEvent;
