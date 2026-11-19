export interface ElfMessage {
  author: string;
  message: string;
}

export interface CalendarDay {
  dayNumber: number;
  title: string | null;
  description: string | null;
  unlockDate: string | null;
  isUnlocked: boolean;
  isOpened: boolean;
}

export interface CalendarData {
  days: CalendarDay[];
  elfMessages: Record<number, ElfMessage>;
  secretMessages: Record<number, string>;
  openedCount: number;
}
