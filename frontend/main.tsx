import { createRoot, type Root } from 'react-dom/client';
import { AuthPanel } from '@/components/auth-panel';
import { JournalPanel } from '@/components/journal-panel';
import { AnimatedAIChat } from '@/components/ui/animated-ai-chat';
import { createChatSession } from '@/lib/chat-session';
import './styles.css';
import './journal.css';
import './chat.css';

let journalRoot: Root | null = null;
window.safeSpaceJournal = {
  mount(host, adapter) {
    journalRoot?.unmount();
    journalRoot = createRoot(host);
    journalRoot.render(<JournalPanel adapter={adapter} scroller={document.getElementById('main')!} />);
  },
  unmount() { journalRoot?.unmount(); journalRoot = null; },
};

const chatSession = createChatSession({
  ...window.safeSpaceChatContext,
  getProvider: async () => window.claude ? window.claude.use('sample') : null,
});
window.safeSpaceChat = { open: chatSession.open, hide: chatSession.hide, reset: chatSession.reset };
const chatRoot = document.getElementById('chat-root');
if (!chatRoot) throw new Error('Safe Space chat mount is missing.');
createRoot(chatRoot).render(<AnimatedAIChat session={chatSession} onClose={() => window.safeSpaceUI.navigate('help')} />);

const root = document.getElementById('auth-root');
if (!root) throw new Error('Safe Space login mount is missing.');
createRoot(root).render(<AuthPanel />);
