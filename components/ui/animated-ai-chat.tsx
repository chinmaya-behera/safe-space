"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, ArrowUpRight, BookOpen, Command, HeartHandshake, Leaf, LifeBuoy, MessageCircle, ShieldCheck, Sparkles, Wind, X } from 'lucide-react';
import type { ChatSession } from '@/lib/chat-session';

const starters = [
  { icon: MessageCircle, label: 'I need to talk', text: 'I’m having a hard day and need someone to listen.' },
  { icon: Wind, label: 'Feeling overwhelmed', text: 'I’m feeling overwhelmed. Can we take this one step at a time?' },
  { icon: HeartHandshake, label: 'Feeling alone', text: 'I’ve been feeling alone lately.' },
];
const commands = [
  { icon: Wind, label: 'Slow breathing', prefix: '/breathe', description: 'A moment to settle your body', action: () => window.safeSpaceUI.openCoping('breath') },
  { icon: Leaf, label: 'Grounding', prefix: '/ground', description: 'Come back to the here and now', action: () => window.safeSpaceUI.openCoping('ground') },
  { icon: BookOpen, label: 'Open journal', prefix: '/journal', description: 'Put your thoughts into words', action: () => window.safeSpaceUI.navigate('jour') },
  { icon: LifeBuoy, label: 'Help now', prefix: '/help', description: 'Find someone you can call', action: () => window.safeSpaceUI.navigate('help') },
];

export function AnimatedAIChat({ session, onClose }: { session: ChatSession; onClose(): void }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const reduced = useReducedMotion();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuDismissed, setMenuDismissed] = useState(false);
  const [selected, setSelected] = useState(0);
  const [focused, setFocused] = useState(false);
  const slash = state.draft.startsWith('/') && !state.draft.includes(' ');
  const matching = commands.filter(command => !slash || command.prefix.startsWith(state.draft.toLowerCase()));
  const palette = (menuOpen || (slash && !menuDismissed)) && matching.length > 0;
  const hasMessages = state.messages.length > 0;
  const enter = { initial: reduced ? false as const : { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduced ? 0 : 0.35 } };
  useEffect(() => {
    if (!state.active) { setMenuOpen(false); setMenuDismissed(false); return; }
    textarea.current?.focus();
  }, [state.active]);
  useEffect(() => {
    const input = textarea.current;
    if (!input) return;
    const resize = () => { input.style.height = '60px'; input.style.height = `${Math.min(160, Math.max(60, input.scrollHeight))}px`; };
    resize(); window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [state.draft]);
  useEffect(() => {
    if (state.active && state.messages.length > 0 && stickToBottom.current && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [state.messages, state.busy, state.active]);
  useEffect(() => {
    if (!palette) return;
    const dismiss = (event: PointerEvent) => {
      if (!composer.current?.contains(event.target as Node)) { setMenuOpen(false); setMenuDismissed(true); }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [palette]);
  const choose = (index: number) => {
    const command = matching[index];
    if (!command) return;
    session.setDraft(''); setMenuOpen(false); setMenuDismissed(false); command.action();
  };
  const send = () => {
    if (state.busy) return;
    if (slash && palette) { choose(Math.min(selected, matching.length - 1)); return; }
    stickToBottom.current = true; setMenuOpen(false); setMenuDismissed(true);
    void session.send(); textarea.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (palette) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); setSelected(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + matching.length) % matching.length);
      } else if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); choose(Math.min(selected, matching.length - 1)); }
      else if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); setMenuDismissed(true); }
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
  };

  return <div className={`ss-ai-chat ${hasMessages ? 'has-messages' : ''}`}>
    <div className="ai-ambient" aria-hidden="true"><i /><i /><i /></div>
    <div className="ai-topbar"><span><HeartHandshake size={15} /> SAFE SPACE <i /></span><button type="button" onClick={onClose} aria-label="Close chat"><X size={17} /></button></div>
    <div ref={transcript} className="ai-scroll" onScroll={() => {
      const element = transcript.current;
      if (element) stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    }}>
      <motion.div className="ai-welcome" {...enter}>
        <div className="ai-orbit" aria-hidden="true"><i /><span><Sparkles size={24} strokeWidth={1.3} /></span></div>
        <div className="ai-eyebrow">YOU DON’T HAVE TO CARRY IT ALONE</div>
        <h1>{hasMessages ? 'A little space to be heard.' : <>How are you<br /><span>really feeling?</span></>}</h1>
        <motion.div className="ai-title-line" initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.2 }} />
        <p>No perfect words needed. I’m here to listen.</p>
      </motion.div>
      <div className="ai-messages" role="log" aria-label="Conversation with Safe Space" aria-live="polite" aria-relevant="additions text">
        {state.messages.filter(message => message.text).map(message => <motion.article key={message.id} className={`ai-message ai-${message.role}`} {...enter}>
          {message.role === 'support' ? <><div className="ai-message-label"><ShieldCheck size={14} /> Support is one tap away</div><p>{message.text}</p><div className="ai-support-links"><a href="tel:112">Call 112 <ArrowUpRight size={12} /></a><a href="tel:14416">Tele-MANAS 14416 <ArrowUpRight size={12} /></a></div></> : <><div className="ai-message-label">{message.role === 'assistant' ? <><Sparkles size={12} /> Safe Space</> : 'You'}</div><p>{message.text}</p></>}
        </motion.article>)}
        <AnimatePresence>{state.busy && <motion.div key="thinking" className="ai-thinking" role="status" {...enter} exit={{ opacity: 0 }}><Sparkles size={13} /><span>Listening</span><span className="ai-typing-dots" aria-hidden="true"><i /><i /><i /></span></motion.div>}</AnimatePresence>
      </div>
    </div>
    <div className="ai-compose-area">
      <motion.div ref={composer} className={`ai-composer ${focused ? 'is-focused' : ''}`} {...enter}>
        <AnimatePresence>{palette && <motion.div className="ai-commands" id="chat-commands" role="listbox" aria-label="Support shortcuts" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 8 }} transition={{ duration: reduced ? 0 : 0.15 }}>
          <div className="ai-command-heading">A SMALL NEXT STEP <span>↑ ↓ to explore · Enter to open</span></div>
          {matching.map((command, index) => <button type="button" role="option" aria-selected={Math.min(selected, matching.length - 1) === index} id={`chat-command-${index}`} key={command.prefix} onClick={() => choose(index)} onPointerEnter={() => setSelected(index)}><command.icon size={16} /><span><b>{command.label}</b><small>{command.description}</small></span><code>{command.prefix}</code></button>)}
        </motion.div>}</AnimatePresence>
        <label className="ai-sr-only" htmlFor="chat-input">Message Safe Space</label>
        <textarea ref={textarea} id="chat-input" rows={2} maxLength={4096} value={state.draft} placeholder="What’s on your mind?" onChange={event => { session.setDraft(event.target.value); setSelected(0); setMenuDismissed(false); }} onKeyDown={onKeyDown} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} aria-controls={palette ? 'chat-commands' : undefined} aria-expanded={palette} aria-activedescendant={palette ? `chat-command-${Math.min(selected, matching.length - 1)}` : undefined} />
        <div className="ai-composer-footer"><button type="button" className="ai-command-toggle" aria-label="Open support shortcuts" aria-expanded={palette} onClick={() => { setMenuOpen(!palette); setMenuDismissed(palette); setSelected(0); textarea.current?.focus(); }}><Command size={14} /><span>Shortcuts</span></button><span className="ai-enter-hint">Enter to send · Shift + Enter for a new line</span><motion.button type="button" className="ai-send" aria-label="Send message" disabled={!state.draft.trim() || state.busy} onClick={send} whileHover={reduced ? undefined : { scale: 1.06 }} whileTap={reduced ? undefined : { scale: 0.94 }}><ArrowUp size={18} /></motion.button></div>
      </motion.div>
      {!hasMessages && <div className="ai-starters">{starters.map((starter, index) => <motion.button key={starter.label} type="button" onClick={() => { session.setDraft(starter.text); textarea.current?.focus(); }} {...enter} transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : index * 0.08 }} whileHover={reduced ? undefined : { y: -3 }} whileTap={reduced ? undefined : { scale: 0.98 }}><starter.icon size={14} /><span>{starter.label}</span></motion.button>)}</div>}
      <div className="ai-disclosure"><span className="ai-mode"><i className={state.connection} />{state.connection === 'ready' ? 'AI support connected' : state.connection === 'loading' ? 'Connecting…' : 'Guided replies · AI unavailable'}</span><span>Peer support, not professional care. Chat history isn’t saved.</span></div>
    </div>
  </div>;
}
