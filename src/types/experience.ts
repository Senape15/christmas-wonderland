import type { CalendarData, CalendarDay } from "@/types/calendar";

/**
 * Stati mostrati nel calendario dell'esperienza quotidiana.
 *
 * - `locked`    → il giorno non è ancora arrivato (nessun dato narrativo).
 * - `available` → il giorno è sbloccato e può essere aperto.
 * - `opened`    → la casella è stata aperta ma restano attività obbligatorie.
 * - `completed` → casella aperta e attività obbligatorie completate.
 */
export type DayState = "locked" | "available" | "opened" | "completed";

export interface ExperienceDay extends CalendarDay {
  isCompleted: boolean;
  state: DayState;
}

export interface SimulationView {
  /** Data simulata nel formato civile `YYYY-MM-DD` (Europe/Rome). */
  date: string;
  note: string;
}

export interface ExperienceCalendar extends Omit<CalendarData, "days"> {
  days: ExperienceDay[];
  simulation: SimulationView | null;
}

export interface UserProgress {
  daysOpened: number;
  daysCompleted: number;
  totalDays: number;
  quizzesCompleted: number;
  quizzesTotal: number;
  pointsEarned: number;
  pointsAvailable: number;
  passwordsFound: number;
  passwordsTotal: number;
  cluesFound: number;
  cluesTotal: number;
  giftsFound: number;
  giftsTotal: number;
  symbolsFound: number;
  symbolsTotal: number;
  spheresUnlocked: number;
  spheresTotal: number;
  surprisesUnlocked: number;
}

export interface ExperienceData {
  calendar: ExperienceCalendar;
  progress: UserProgress;
}

export type ContentKind =
  | "letter"
  | "note"
  | "object"
  | "photo"
  | "clue"
  | "puzzle"
  | "password";

export interface PasswordChallenge {
  hint: string;
  maxAttempts: number | null;
  attemptsUsed: number;
  remainingAttempts: number | null;
  completed: boolean;
  canAttempt: boolean;
}

export interface DayContent {
  id: string;
  kind: ContentKind;
  title: string;
  /** Testo narrativo configurato dall'admin. */
  text: string;
  imageUrl: string | null;
  sortOrder: number;
  requiresPassword: boolean;
  password: PasswordChallenge | null;
  /** Mostrato solo dopo il completamento della password. */
  successMessage: string | null;
  completed: boolean;
}

export interface DaySymbol {
  id: string;
  symbol: string;
  description: string;
  imageUrl: string | null;
}

export interface DayGift {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  symbols: DaySymbol[];
}

export interface DayMessage {
  author: string;
  message: string;
}

export interface DayQuizAnswer {
  id: string;
  answerText: string;
}

export interface DayQuiz {
  id: string;
  question: string;
  hint: string;
  points: number;
  isRequired: boolean;
  completed: boolean;
  answers: DayQuizAnswer[];
  /** Presente solo dopo una risposta corretta: mai prima della verifica. */
  correctAnswerText: string | null;
}

export interface DayMemorySphere {
  id: string;
  title: string;
  note: string | null;
  photoUrl: string | null;
}

export interface FinalBoxView {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  shape: string;
  color: string;
  decorations: string[];
  symbol: string | null;
  introMessage: string;
  clues: string[];
  objects: string[];
  finalMessage: string;
  passwordEnabled: boolean;
  passwordHint: string;
  openingSequence: string[];
  completed: boolean;
}

export interface DayExperience {
  dayNumber: number;
  title: string;
  description: string;
  /** `true` quando la casella era già stata aperta in precedenza. */
  isReplay: boolean;
  simulation: SimulationView | null;
  elfMessage: DayMessage | null;
  secretMessage: string | null;
  hotspot: {
    name: string;
    hint: string;
    nicoMessage: string;
    nicoExpression: string;
  } | null;
  contents: DayContent[];
  /** Contenuti nascosti da condizioni non ancora soddisfatte (nessun dettaglio). */
  hiddenContents: number;
  gifts: DayGift[];
  quizzes: DayQuiz[];
  hiddenQuizzes: number;
  memorySpheres: DayMemorySphere[];
  finalBox: FinalBoxView | null;
  openedAt: string | null;
}

export type DayExperienceResult =
  | { ok: true; data: DayExperience; error: null }
  | { ok: false; data: null; error: string };

export interface PasswordActionResult {
  ok: boolean;
  error: string | null;
  message: string | null;
  remainingAttempts: number | null;
  completed: boolean;
  simulation: boolean;
}

export interface QuizActionResult {
  ok: boolean;
  error: string | null;
  correct: boolean | null;
  message: string | null;
  correctAnswerText: string | null;
  points: number;
  completed: boolean;
  simulation: boolean;
}

export interface FinalBoxActionResult {
  ok: boolean;
  error: string | null;
  message: string | null;
  completed: boolean;
  simulation: boolean;
}
