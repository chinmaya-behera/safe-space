import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Check, Feather, LockKeyhole, Moon, RotateCcw, Sparkles, Sun, Trash2 } from 'lucide-react';
import { JournalScrollMap } from '@/components/ui/journal-scroll-map';
import { moods, prompts, type JournalAdapter, type JournalEntry } from '@/lib/journal';

const date = (id: number) => new Date(id).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const emptyDraft = { mood: null, tx: '', gd: '' };

export function JournalPanel({ adapter, scroller }: { adapter: JournalAdapter; scroller: HTMLElement }) {
  const [tab, setTab] = useState<'write' | 'entries'>('write');
  const [theme, setTheme] = useState(() => adapter.theme());
  const [draft, setDraft] = useState(() => adapter.draft());
  const [entries, setEntries] = useState(() => adapter.entries());
  const [trash, setTrash] = useState(() => adapter.trash());
  const [showTrash, setShowTrash] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [notice, setNotice] = useState('');
  const [care, setCare] = useState(false);
  const [saved, setSaved] = useState(false);
  const text = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const app = scroller.closest<HTMLElement>('.app');
    if (app) app.dataset.journalTheme = theme;
    return () => { if (app) delete app.dataset.journalTheme; };
  }, [scroller, theme]);
  useEffect(() => {
    if (!notice || notice.includes('blocked')) return;
    const timeout = window.setTimeout(() => setNotice(''), 6500);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    const nodes = root.current?.querySelectorAll('.j-reveal');
    const observer = new IntersectionObserver(records => records.forEach(record => {
      if (record.isIntersecting) { record.target.classList.add('is-revealed'); observer.unobserve(record.target); }
    }), { root: scroller, threshold: 0.08 });
    nodes?.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [scroller, tab, showTrash, entries, trash]);
  const update = (next: typeof draft) => { setDraft(next); adapter.setDraft(next); setSaved(false); };
  const switchTab = (next: typeof tab) => { setTab(next); scroller.scrollTo({ top: 0, behavior: 'instant' }); };
  const save = () => {
    const tx = draft.tx.trim(), gd = draft.gd.trim();
    if (!tx && !gd && !draft.mood) { setNotice('Write a few words or choose a mood to save your moment.'); return; }
    const ok = adapter.save({ id: Date.now(), mood: draft.mood, tx, gd });
    setEntries(adapter.entries()); setCare(adapter.needsCare(draft));
    if (adapter.needsCare(draft)) scroller.scrollTo({ top: 0, behavior: 'instant' });
    if (ok) { update(emptyDraft); setSaved(true); setNotice('Entry saved. You showed up for yourself today.'); }
    else setNotice('Your browser blocked storage. Your words are still here; please copy them somewhere safe.');
  };
  const remove = (entry: JournalEntry) => {
    const ok = adapter.remove(entry.id);
    setEntries(adapter.entries()); setTrash(adapter.trash());
    setNotice(ok ? 'Entry moved to Recently deleted. You can restore it there.' : 'Your browser blocked storage. The entry was kept.');
  };
  const restore = (entry: JournalEntry) => {
    const ok = adapter.restore(entry.id);
    setEntries(adapter.entries()); setTrash(adapter.trash());
    setNotice(ok ? 'Entry restored to your journal.' : 'Your browser blocked storage. Please try again.');
  };
  const wordCount = draft.tx.trim() ? draft.tx.trim().split(/\s+/).length : 0;
  const recent = entries.filter(entry => entry.mood).slice(0, 14).reverse();
  return <div ref={root} className="ss-journal">
    <div className="j-heading">
      <div><div className="j-eyebrow"><span className="j-live-dot" /> A MOMENT FOR YOU</div><h1>Your mind,<br /><span>a little lighter.</span></h1><p>A place to pause, feel, and put it into words.<br />One sentence is a perfectly good start.</p></div>
      <div className="j-cover" aria-hidden="true"><div className="j-cover-lines" /><Feather size={36} strokeWidth={1.2} /><span>dear<br /><em>me.</em></span><small>ONE DAY AT A TIME</small><i>✳</i></div>
    </div>
    <div className="j-toolbar"><div className="j-tabs" aria-label="Journal views"><button type="button" aria-pressed={tab === 'write'} onClick={() => switchTab('write')}><Feather size={15} /> Write a moment</button><button type="button" aria-pressed={tab === 'entries'} onClick={() => switchTab('entries')}><BookOpen size={15} /> My entries <small>{entries.length}</small></button></div><div className="j-toolbar-tools"><span className="j-device"><LockKeyhole size={12} /> On this device</span><button className="j-theme-toggle" type="button" aria-label={`Switch journal to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`${theme === 'light' ? 'Dark' : 'Light'} mode`} onClick={() => { const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); adapter.setTheme(next); }}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button></div></div>
    <div className="j-notice" role="status" aria-live="polite">{notice && <div key={notice}>{saved && <Check size={17} />}<span>{notice}</span><button type="button" aria-label="Dismiss journal message" onClick={() => setNotice('')}>×</button></div>}</div>
    {care && <div className="j-care" dangerouslySetInnerHTML={{ __html: adapter.careHTML }} />}
    {tab === 'write' ? <>
      <section id="check-in" className="j-section j-reveal"><div className="j-section-label"><span>01 / CHECK IN</span><span>NO RIGHT OR WRONG</span></div><h2>How is your heart today?</h2><p className="j-muted">All feelings are welcome here. Pick what feels closest.</p><div className="j-moods">{moods.map(mood => <button type="button" key={mood.value} aria-pressed={draft.mood === mood.value} onClick={() => update({ ...draft, mood: draft.mood === mood.value ? null : mood.value })} style={{ '--mood-color': mood.color } as CSSProperties}><span>{mood.face}</span><b>{mood.label}</b><i>{draft.mood === mood.value ? <Check size={12} /> : null}</i></button>)}</div></section>
      <section id="inspiration" className="j-section j-reveal"><div className="j-section-label"><span>02 / A LITTLE INSPIRATION</span><Sparkles size={15} /></div><h2>Start somewhere gentle.</h2><p className="j-muted">Use a prompt, or simply follow your own thoughts.</p><div className="j-prompt-card"><span className="j-prompt-star" aria-hidden="true">✳</span><div key={promptIndex} className="j-prompt-text"><small>A THOUGHT TO SIT WITH</small><p>{prompts[promptIndex]}</p></div><div className="j-prompt-actions"><button type="button" onClick={() => { update({ ...draft, tx: draft.tx + (draft.tx ? '\n\n' : '') + prompts[promptIndex] + '\n' }); text.current?.focus(); }}>Write about this <ArrowDown size={14} /></button><button type="button" aria-label="Try another journal prompt" onClick={() => setPromptIndex((promptIndex + 1) % prompts.length)}><RotateCcw size={14} /> Another prompt</button></div></div><div className="j-prompt-dots" aria-label="Choose a writing prompt">{prompts.map((prompt, i) => <button type="button" key={prompt} aria-label={`Prompt ${i + 1}: ${prompt}`} aria-pressed={i === promptIndex} onClick={() => setPromptIndex(i)} />)}</div></section>
      <section id="reflection" className="j-section j-reveal"><div className="j-section-label"><span>03 / LET IT OUT</span><span>TAKE YOUR TIME</span></div><label className="j-field-label" htmlFor="journal-thoughts">What’s on your mind?</label><p className="j-muted">Messy thoughts, small wins, hard days. There’s room for it all.</p><div className="j-paper"><textarea ref={text} id="journal-thoughts" rows={7} placeholder="Dear me, today I’m feeling…" value={draft.tx} onChange={event => update({ ...draft, tx: event.target.value })} /><div className="j-paper-foot"><span><Feather size={12} /> Just you and your thoughts</span><span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span></div></div></section>
      <section id="small-good" className="j-section j-reveal"><div className="j-section-label"><span>04 / THE SMALL GOOD</span><span>OPTIONAL</span></div><label className="j-field-label" htmlFor="journal-helped">What helped, even a little?</label><p className="j-muted">A warm drink. A kind message. Getting through today.</p><textarea className="j-helped" id="journal-helped" rows={3} placeholder="One small thing I want to remember…" value={draft.gd} onChange={event => update({ ...draft, gd: event.target.value })} /><div className="j-save-row"><span>You don’t have to have it all figured out.</span><button className={`j-primary ${saved ? 'j-saved' : ''}`} type="button" onClick={save}>{saved ? <><Check size={16} /> Saved</> : <>Save my moment <ArrowRight size={16} /></>}</button></div><p className="j-privacy"><LockKeyhole size={12} /> Entries stay in this browser, on this device. They aren’t encrypted or synced.</p></section>
      <div className="j-endnote"><span>✧</span><p>Thank you for making<br /><em>a little space for yourself.</em></p></div><JournalScrollMap scroller={scroller} />
    </> : <div className="j-archive">
      <div className="j-archive-heading"><div><div className="j-eyebrow">YOUR PAGES, YOUR PACE</div><h2>{showTrash ? 'Recently deleted' : 'Little moments, kept.'}</h2></div><button className="j-text-button" type="button" onClick={() => setShowTrash(!showTrash)}>{showTrash ? <BookOpen size={14} /> : <Trash2 size={14} />}{showTrash ? 'Back to entries' : `Recently deleted (${trash.length})`}</button></div>
      {!showTrash && recent.length > 1 && <section className="j-mood-history j-reveal"><div><h3>The way you’ve been feeling</h3><p className="j-muted">Your last {recent.length} check-ins. Feelings can change.</p></div><div className="j-mood-chart" aria-label="Recent mood history">{recent.map(entry => <div key={entry.id} className="j-mood-bar" style={{ height: `${(entry.mood || 1) * 16 + 12}%`, background: moods[(entry.mood || 1) - 1]?.color }} title={`${date(entry.id)}: ${moods[(entry.mood || 1) - 1]?.label}`}><span className="j-sr-only">{date(entry.id)}: {moods[(entry.mood || 1) - 1]?.label}</span></div>)}</div><div className="j-chart-caption"><span>Earlier</span><span>Latest</span></div></section>}
      {(showTrash ? trash : entries).length === 0 ? <div className="j-empty j-reveal"><BookOpen size={35} strokeWidth={1} /><h3>{showTrash ? 'Nothing here.' : 'Your story starts here.'}</h3><p>{showTrash ? 'Deleted entries will stay here so you can restore them.' : 'Your first entry can be a single word, a feeling, or a little moment.'}</p>{!showTrash && <button className="j-primary" type="button" onClick={() => switchTab('write')}>Write your first moment <ArrowRight size={16} /></button>}</div> : (showTrash ? trash : entries).map((entry, i) => <article key={entry.id} className="j-entry j-reveal"><div className="j-entry-top"><span className="j-entry-number">PAGE {String((showTrash ? trash : entries).length - i).padStart(2, '0')}</span><time dateTime={new Date(entry.id).toISOString()}>{date(entry.id)}</time></div>{entry.mood && <div className="j-entry-mood"><span>{moods[entry.mood - 1]?.face}</span>{moods[entry.mood - 1]?.label}</div>}{entry.tx && <p className="j-entry-words">{entry.tx}</p>}{entry.gd && <div className="j-entry-good"><Sparkles size={15} /><p><small>THE SMALL GOOD</small>{entry.gd}</p></div>}<div className="j-entry-footer"><span>{showTrash ? 'Kept here until you restore it.' : 'A moment you made space for.'}</span><button className="j-text-button" type="button" aria-label={`${showTrash ? 'Restore' : 'Move to recently deleted'} entry from ${date(entry.id)}`} onClick={() => showTrash ? restore(entry) : remove(entry)}>{showTrash ? <RotateCcw size={14} /> : <Trash2 size={14} />}{showTrash ? 'Restore' : 'Delete'}</button></div></article>)}
    </div>}
  </div>;
}
