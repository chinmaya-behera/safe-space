export interface JournalEntry { id: number; mood: number | null; tx: string; gd: string }
export interface JournalDraft { mood: number | null; tx: string; gd: string }
export interface JournalAdapter {
  entries(): JournalEntry[];
  trash(): JournalEntry[];
  draft(): JournalDraft;
  setDraft(draft: JournalDraft): void;
  theme(): 'light' | 'dark';
  setTheme(theme: 'light' | 'dark'): void;
  save(entry: JournalEntry): boolean;
  remove(id: number): boolean;
  restore(id: number): boolean;
  needsCare(draft: JournalDraft): boolean;
  careHTML: string;
}

export const moods = [
  { value: 1, face: '😞', label: 'Very low', color: '#a19ab7' },
  { value: 2, face: '😔', label: 'Low', color: '#b4bad3' },
  { value: 3, face: '😐', label: 'Okay', color: '#e9c273' },
  { value: 4, face: '🙂', label: 'Better', color: '#a0c7a2' },
  { value: 5, face: '😊', label: 'Good', color: '#ed9a86' },
];
export const prompts = [
  'What is weighing on me most right now?',
  'One small thing that was a little okay today…',
  'Someone who would care if they knew how I feel…',
  'What I need most in this moment…',
  'A hard moment I got through before…',
  'What I would tell a friend who felt this way…',
  'One tiny thing I can do for myself in the next hour…',
];
export const sections = [
  { id: 'check-in', title: 'Check in', note: 'Make room for how you feel.', color: '#e4dff0', symbol: '◌' },
  { id: 'inspiration', title: 'A little inspiration', note: 'A gentle place to begin.', color: '#f5e5ca', symbol: '✳' },
  { id: 'reflection', title: 'Let it out', note: 'Your words. Your own pace.', color: '#dfebe0', symbol: '≋' },
  { id: 'small-good', title: 'The small good', note: 'Even the tiniest thing counts.', color: '#f6dcd3', symbol: '✧' },
];

declare global {
  interface Window {
    safeSpaceJournal: { mount(host: HTMLElement, adapter: JournalAdapter): void; unmount(): void };
  }
}
