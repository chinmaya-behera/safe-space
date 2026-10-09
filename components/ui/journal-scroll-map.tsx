import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { sections } from '@/lib/journal';

/** An original scroll navigator inspired by Skiper's section preview interaction. */
export function JournalScrollMap({ scroller }: { scroller: HTMLElement }) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  const [preview, setPreview] = useState<number | 'active' | null>(null);
  const frame = useRef(0);
  useEffect(() => {
    const update = () => {
      frame.current = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      setProgress(max > 0 ? scroller.scrollTop / max * 100 : 0);
      const top = scroller.getBoundingClientRect().top;
      let current = 0;
      sections.forEach((section, i) => {
        const element = scroller.querySelector(`#${section.id}`);
        if (element && element.getBoundingClientRect().top - top < scroller.clientHeight * 0.42) current = i;
      });
      setActive(current);
    };
    const schedule = () => { if (!frame.current) frame.current = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);
    const content = scroller.querySelector('.ss-journal');
    if (content) observer.observe(content);
    scroller.addEventListener('scroll', schedule, { passive: true });
    update();
    return () => { observer.disconnect(); scroller.removeEventListener('scroll', schedule); cancelAnimationFrame(frame.current); };
  }, [scroller]);
  const jump = (index: number) => {
    const target = scroller.querySelector<HTMLElement>(`#${sections[index].id}`);
    if (!target) return;
    const top = scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 20;
    scroller.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const previewIndex = preview === 'active' ? active : preview ?? active;
  const shown = sections[previewIndex];
  return <aside className="j-map" aria-label="Journal section navigator">
    <div className={`j-preview ${preview !== null ? 'is-visible' : ''}`} aria-hidden="true">
      <div className="j-preview-art" style={{ '--preview-color': shown.color } as CSSProperties} key={shown.id}><span>{shown.symbol}</span><small>YOUR MOMENT / 0{previewIndex + 1}</small></div>
      <div className="j-preview-copy"><span>// {shown.title}</span><p>{shown.note}</p><ArrowUpRight size={16} /></div>
    </div>
    <div className="j-map-label"><span><i /> {sections[active].title}</span><small>{Math.round(progress)}%</small></div>
    <div className="j-map-track" onMouseEnter={() => setPreview('active')} onMouseLeave={() => setPreview(null)}>
      <div className="j-map-ticks" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <i key={i} className={i / 35 * 100 <= progress ? 'passed' : ''} />)}</div>
      <input type="range" min="0" max="100" step="1" value={progress} aria-label="Journal scroll position" aria-valuetext={`${Math.round(progress)}%, ${sections[active].title}`}
        onFocus={() => setPreview('active')} onBlur={() => setPreview(null)} onChange={event => {
          const value = Number(event.target.value); setProgress(value);
          scroller.scrollTo({ top: (scroller.scrollHeight - scroller.clientHeight) * value / 100, behavior: 'instant' });
        }} />
    </div>
    <div className="j-map-links">{sections.map((section, i) => <button key={section.id} type="button" aria-label={`Go to ${section.title}`} aria-current={active === i ? 'step' : undefined}
      onMouseEnter={() => setPreview(i)} onMouseLeave={() => setPreview(null)} onFocus={() => setPreview(i)} onBlur={() => setPreview(null)} onClick={() => jump(i)}>0{i + 1}</button>)}</div>
  </aside>;
}
