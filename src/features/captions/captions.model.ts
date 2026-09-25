export type TCaptionPosition = {
  x: number;
  y: number;
};

export enum ECaptionHorizontalAlignment {
  Left = 'left',
  Center = 'center',
  Right = 'right',
}

export enum ECaptionHistoryDirection {
  Up = 'up',
  Down = 'down',
}

export type TCaptionLayout = {
  position: {
    x: number;
    y: number;
  };

  horizontalAlignment: ECaptionHorizontalAlignment;
  historyDirection: ECaptionHistoryDirection;
  maxWidth: number;
};
