import { createRoot, type Root } from 'react-dom/client';
import { AuthPanel } from '@/components/auth-panel';
import { JournalPanel } from '@/components/journal-panel';
import './styles.css';
import './journal.css';

let journalRoot: Root | null = null;
window.safeSpaceJournal = {
  mount(host, adapter) {
    journalRoot?.unmount();
    journalRoot = createRoot(host);
    journalRoot.render(<JournalPanel adapter={adapter} scroller={document.getElementById('main')!} />);
  },
  unmount() { journalRoot?.unmount(); journalRoot = null; },
};

const root = document.getElementById('auth-root');
if (!root) throw new Error('Safe Space login mount is missing.');
createRoot(root).render(<AuthPanel />);
