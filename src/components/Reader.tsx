import { useState, useEffect, useRef } from "react";
import {
  ExternalLink,
  Minus,
  Plus,
  RotateCcw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  hasTranslation,
  localizedSource,
  type Content,
} from "../../shared/schema";
import { useApp, readLocal, writeLocal } from "../store";
import { Modal } from "./ui";
import { mediaUrl } from "../api";
import { readCount, saveCount, readingDay } from "../adhkar-progress";
export function Reader({
  content,
  onClose,
  sequence = [],
  onNavigate,
}: {
  content: Content;
  onClose: () => void;
  sequence?: Content[];
  onNavigate?: (c: Content) => void;
}) {
  const { prefs, setPrefs, t, prayer, now } = useApp();
  const reading = ["dhikr", "dua"].includes(content.kind);
  const preview = content.status !== "published";
  const day = readingDay(now, prayer?.location.timezone);
  const index = sequence.findIndex(c => c.id === content.id);
  const sequential = reading && !!onNavigate && index >= 0;
  const top = useRef<HTMLDivElement>(null);
  const touch = useRef<{x:number;y:number}|null>(null);
  const text = content.translations[prefs.locale];
  const key = `namoz.count.${content.id}.${new Date().toLocaleDateString("en-CA")}`;
  const [count, setCount] = useState(() => reading ? readCount(content,day,preview) : readLocal(key, 0));
  useEffect(() => {
    setCount(reading ? readCount(content,day,preview) : readLocal(key, 0));
    top.current?.scrollTo({top:0});
  }, [content.id, day, preview]);
  const setProgress = (value: number) => {
    setCount(value);
    if (reading) saveCount(content,day,value,preview); else writeLocal(key,value);
  };
  const increase = () => {
    const n = Math.min(content.repetitions ?? 1, count + 1);
    setProgress(n);
  };
  if (!hasTranslation(content, prefs.locale))
    return (
      <Modal label={t("missingTranslation")} onClose={onClose} fullScreen={reading} className={reading ? "reader-modal reader-screen" : ""}>
        <p>{t("missingTranslation")}</p>
      </Modal>
    );
  return (
    <Modal label={text.title} onClose={onClose} wide fullScreen={reading} className={`reader-modal${reading ? " reader-screen" : ""}`}>
      <div className="reader-scroll" ref={top} tabIndex={0} aria-label={text.title}>
      <div className="reader-toolbar">
        {sequential ? <div className="reading-progress" aria-live="polite">
          <span>{t("dhikrPosition").replace("{current}",String(index+1)).replace("{total}",String(sequence.length))}</span>
          <progress value={index+1} max={sequence.length} aria-label={t("readingProgress")} />
        </div> : <span className="badge">
          <BookOpen size={13} />
          {t("source")}
        </span>}
        <div>
          <button
            className="icon-button"
            aria-label={t("fontSize")}
            onClick={() =>
              setPrefs({ fontScale: Math.max(1, prefs.fontScale - 0.1) })
            }
          >
            <Minus size={16} />
          </button>
          <button
            className="icon-button"
            aria-label={t("fontSize")}
            onClick={() =>
              setPrefs({ fontScale: Math.min(1.5, prefs.fontScale + 0.1) })
            }
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      {preview && reading && <p className="reader-preview-note">{t("adhkarPreviewNotice")}</p>}
      <article className="reader-content" onTouchStart={e=>{
        if (e.touches.length===1) touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
        else touch.current=null;
      }} onTouchEnd={e=>{
        if (!sequential || !touch.current || !e.changedTouches.length || window.getSelection()?.toString()) return;
        const dx=e.changedTouches[0].clientX-touch.current.x, dy=e.changedTouches[0].clientY-touch.current.y;
        touch.current=null;
        if(Math.abs(dx)>90 && Math.abs(dx)>Math.abs(dy)*2) {
          const target=sequence[index+(dx<0?1:-1)]; if(target) onNavigate?.(target);
        }
      }}>
        {content.imageUrl && (
          <img
            className="reader-image"
            src={mediaUrl(content.imageUrl)}
            alt=""
          />
        )}
        {content.arabic && (
          <p lang="ar" dir="rtl" className="arabic">
            {content.arabic}
          </p>
        )}
        {prefs.showTransliteration && text.transliteration && (
          <section>
            <h3>{t("transliteration")}</h3>
            <p>{text.transliteration}</p>
            {reading && <small className="muted">{t("transcriptionHelp")}</small>}
          </section>
        )}
        <section>
          {content.arabic && <h3>{t("translation")}</h3>}
          <p className="preserve-lines">{text.body}</p>
        </section>
        <div className="hadith-source">
          <strong>{t("source")}</strong>
          <p>{localizedSource(content, prefs.locale)}</p>
          <small>
            {content.grade === "sahih"
              ? t("sahih")
              : content.grade === "quran"
                ? "Qur’an"
                : ""}
            {content.grader && ` · ${content.grader}`}
          </small>
        </div>
        {text.videoUrl && (
          <a
            className="button secondary"
            href={text.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("watch")}
            <ExternalLink size={16} />
          </a>
        )}
      </article>
      </div>
      {(content.repetitions || reading || sequential) && <div className="reader-footer">
        {(content.repetitions || reading) && (
          <div className="counter">
            <button
              className={`count-button ${count >= (content.repetitions ?? 1) ? "complete" : ""}`}
              onClick={increase}
              disabled={count >= (content.repetitions ?? 1)}
              aria-label={t(content.repetitions ? "repetitions" : "markRead")}
            >
              <span aria-live="polite" aria-atomic="true">{count}</span>
              <small>/ {content.repetitions ?? 1}</small>
            </button>
            <button
              className="text-button"
              onClick={() => {
                setProgress(0);
              }}
            >
              <RotateCcw size={14} />
              {t("reset")}
            </button>
          </div>
        )}
      {sequential && <nav className="reader-navigation" aria-label={t("adhkar")}>
        <button className="button secondary" disabled={index===0} onClick={()=>onNavigate!(sequence[index-1])}><ChevronLeft size={18}/><span>{t("previousDhikr")}</span></button>
        {index < sequence.length-1 ? <button className="button primary" onClick={()=>onNavigate!(sequence[index+1])}><span>{t("nextDhikr")}</span><ChevronRight size={18}/></button> : <button className="button primary" onClick={onClose}><span>{t("backToList")}</span></button>}
      </nav>}
      </div>}
    </Modal>
  );
}
