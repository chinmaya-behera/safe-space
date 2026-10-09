export interface ChatMessage { id: string; role: 'user' | 'assistant' | 'support'; text: string }
export interface ProviderMessage { role: 'user' | 'assistant'; content: string }
export type ChatProvider = (messages: ProviderMessage[], options: {
  cache: false; onText(event: { text: string }): void;
}) => Promise<{ text: string }>;
export interface ChatSnapshot {
  messages: ChatMessage[]; draft: string; busy: boolean; active: boolean;
  connection: 'loading' | 'ready' | 'guided';
}
const fallback = [
  "Thank you for sharing that with me. It sounds really heavy. Do you want to tell me more about what's been weighing on you?",
  "I'm here and listening. What part of this is hurting the most right now?",
  "That sounds really hard, and your feelings make sense. Is there one person you trust that you could reach out to today?",
];
const support = "You're not alone, and your life matters. If you're in danger right now, please call 112. You can also talk to a trained person any time, free: Tele-MANAS 14416 (24/7), iCall 9152987821, or AASRA +91-9820466726. You can also open Help Now below.";

function deadline<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chat response timed out')), milliseconds);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

/** Conversation lives only in page memory. Reset invalidates every pending reply. */
export function createChatSession({ getProvider, system, isRisk, timeoutMs = 30000 }: {
  getProvider(): Promise<ChatProvider | null>; system: string; isRisk(text: string): boolean; timeoutMs?: number;
}) {
  let state: ChatSnapshot = { messages: [], draft: '', busy: false, active: false, connection: 'loading' };
  let generation = 0, sequence = 0;
  let provider: ChatProvider | null = null;
  let connecting: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const patch = (next: Partial<ChatSnapshot>) => { state = { ...state, ...next }; listeners.forEach(listener => listener()); };
  const message = (role: ChatMessage['role'], text: string): ChatMessage => ({ id: `${generation}-${++sequence}`, role, text });
  const connect = () => {
    if (connecting) return connecting;
    const current = generation;
    connecting = deadline(Promise.resolve().then(getProvider), timeoutMs).then(result => {
      if (current !== generation) return;
      provider = typeof result === 'function' ? result : null;
      patch({ connection: provider ? 'ready' : 'guided' });
    }).catch(() => { if (current === generation) { provider = null; patch({ connection: 'guided' }); } });
    return connecting;
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state,
    setDraft(draft: string) { patch({ draft: draft.slice(0, 4096) }); },
    open() { patch({ active: true }); void connect(); },
    hide() { patch({ active: false }); },
    reset() {
      generation++; provider = null; connecting = null;
      patch({ messages: [], draft: '', busy: false, active: false, connection: 'loading' });
    },
    async send(input = state.draft) {
      const text = input.trim().slice(0, 4096);
      if (!text || state.busy || !state.active) return false;
      const current = generation;
      const additions = [message('user', text)];
      if (isRisk(text)) additions.push(message('support', support));
      patch({ messages: [...state.messages, ...additions], draft: '', busy: true });
      await connect();
      if (current !== generation) return false;
      const answer = message('assistant', '');
      const history: ProviderMessage[] = state.messages.filter(item => item.role !== 'support')
        .slice(-20).map(item => ({ role: item.role as 'user' | 'assistant', content: item.text }));
      patch({ messages: [...state.messages, answer] });
      let response = '', streaming = true;
      try {
        if (!provider) throw new Error('Guided support');
        const result = await deadline(provider([
          { role: 'user', content: system + '\n\nThe person has started a support conversation.' },
          { role: 'assistant', content: "I'll respond warmly and safely." }, ...history,
        ], { cache: false, onText: event => {
          if (current !== generation || !streaming || typeof event.text !== 'string') return;
          patch({ messages: state.messages.map(item => item.id === answer.id ? { ...item, text: event.text } : item) });
        } }), timeoutMs);
        if (typeof result?.text !== 'string' || !result.text.trim()) throw new Error('Empty chat response');
        response = result.text;
      } catch {
        if (current !== generation) return false;
        provider = null; patch({ connection: 'guided' });
        response = fallback[(history.filter(item => item.role === 'user').length - 1) % fallback.length];
      } finally { streaming = false; }
      if (current !== generation) return false;
      patch({ busy: false, messages: state.messages.map(item => item.id === answer.id ? { ...item, text: response } : item) });
      return true;
    },
  };
}
export type ChatSession = ReturnType<typeof createChatSession>;
declare global {
  interface Window {
    claude?: { use(name: string): Promise<ChatProvider> };
    safeSpaceChatContext: { system: string; isRisk(text: string): boolean };
    safeSpaceChat: { open(): void; hide(): void; reset(): void };
  }
}
