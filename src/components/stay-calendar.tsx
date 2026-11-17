import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Check-in / check-out range picker.
 *
 * Modelled on the calendar on thehosteller.com's availability bar (two months
 * side by side, a chip per date, pill-highlighted range, month stepper), drawn
 * in the villa's palette: cream panels, terracotta selection, serif month names.
 *
 * Prerender-safe: the two triggers render deterministic markup, and the panel
 * only exists after the visitor opens it. No useId() — the prerender tree and
 * the client tree would hand out different ids and break hydration.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pad = (n: number) => String(n).padStart(2, '0');

function isoOf(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function partsOf(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month: month - 1, day };
}

function addDays(iso: string, days: number) {
  const { year, month, day } = partsOf(iso);
  const dt = new Date(year, month, day + days);
  return isoOf(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const a = partsOf(checkIn);
  const b = partsOf(checkOut);
  const ms = new Date(b.year, b.month, b.day).getTime() - new Date(a.year, a.month, a.day).getTime();
  return Math.round(ms / 86400000);
}

/** "14 Nov 2026" */
export function prettyShort(iso: string) {
  const { year, month, day } = partsOf(iso);
  return `${day} ${MONTHS[month].slice(0, 3)} ${year}`;
}

/** "14 Nov" — for the minimum-stay sentence, where the year is noise. */
function prettyDay(iso: string) {
  const { month, day } = partsOf(iso);
  return `${day} ${MONTHS[month].slice(0, 3)}`;
}

interface Props {
  checkIn: string;
  checkOut: string;
  today: string;
  minNights?: number;
  onChange: (next: { checkIn: string; checkOut: string }) => void;
}

export function StayCalendar({ checkIn, checkOut, today, minNights = 2, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<'in' | 'out'>('in');
  const [hover, setHover] = useState('');
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);
  const [view, setView] = useState(() => {
    const base = partsOf(checkIn || today);
    return { year: base.year, month: base.month };
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const checkInRef = useRef<HTMLButtonElement>(null);

  // Jump the two visible months to whichever end is being edited.
  const openFor = (which: 'in' | 'out') => {
    const base = partsOf((which === 'out' ? checkOut || checkIn : checkIn) || today);
    setView({ year: base.year, month: base.month });
    setActive(which);
    setHover('');
    setOpen(true);
  };

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* Earliest legal check-out for the chosen check-in (undefined until one is chosen). */
  const minCheckOut = checkIn ? addDays(checkIn, minNights) : '';
  const nights = nightsBetween(checkIn, checkOut);

  /** A too-short check-out changes nothing; the policy line at the foot speaks instead. */
  const nudgePolicy = () => {
    setFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), 2600);
  };

  const pick = (iso: string) => {
    if (iso < today) return;
    const startingOver = active === 'in' || !checkIn || Boolean(checkIn && checkOut);
    if (startingOver) {
      onChange({ checkIn: iso, checkOut: '' });
      setActive('out');
      return;
    }
    if (iso < minCheckOut) {
      nudgePolicy();
      return;
    }
    onChange({ checkIn, checkOut: iso });
    setActive('in');
    setOpen(false);
  };

  const clear = () => {
    onChange({ checkIn: '', checkOut: '' });
    setActive('in');
    setHover('');
  };

  const canGoBack = (() => {
    const t = partsOf(today);
    return view.year > t.year || (view.year === t.year && view.month > t.month);
  })();

  const step = (delta: number) => {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  // While choosing the check-out, the band follows the cursor.
  const previewEnd = active === 'out' && checkIn && !checkOut ? hover : '';

  return (
    <div className="stay-dates" ref={rootRef}>
      <div className="stay-date-grid">
        <div className="field">
          <label htmlFor="check-in">Check in</label>
          <button
            ref={checkInRef}
            id="check-in"
            type="button"
            className={`date-trigger${open && active === 'in' ? ' is-open' : ''}`}
            onClick={() => (open && active === 'in' ? setOpen(false) : openFor('in'))}
            data-testid="input-check-in"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <CalendarDays size={16} aria-hidden="true" />
            <span className={checkIn ? '' : 'is-placeholder'}>{checkIn ? prettyShort(checkIn) : 'Add date'}</span>
          </button>
        </div>
        <div className="field">
          <label htmlFor="check-out">Check out</label>
          <button
            id="check-out"
            type="button"
            className={`date-trigger${open && active === 'out' ? ' is-open' : ''}`}
            onClick={() => (open && active === 'out' ? setOpen(false) : openFor('out'))}
            data-testid="input-check-out"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <CalendarDays size={16} aria-hidden="true" />
            <span className={checkOut ? '' : 'is-placeholder'}>{checkOut ? prettyShort(checkOut) : 'Add date'}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="stay-cal" role="dialog" aria-label="Choose your dates">
          <div className="stay-cal-chips">
            <button type="button" className={`stay-cal-chip${active === 'in' ? ' is-active' : ''}`} onClick={() => setActive('in')}>
              <span>Check in</span>
              {checkIn ? prettyShort(checkIn) : 'Select date'}
            </button>
            <button type="button" className={`stay-cal-chip${active === 'out' ? ' is-active' : ''}`} onClick={() => setActive('out')}>
              <span>Check out</span>
              {checkOut ? prettyShort(checkOut) : 'Select date'}
            </button>
          </div>

          <div className="stay-cal-head">
            <p className="stay-cal-title display-font" aria-live="polite">
              {MONTHS[view.month]} <span>{view.year}</span>
            </p>
            <div className="stay-cal-nav">
              <button type="button" onClick={() => step(-1)} disabled={!canGoBack} aria-label="Previous month">
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next month">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="stay-cal-months">
            {[0, 1].map((offset) => (
              <Month
                key={offset}
                year={view.month + offset > 11 ? view.year + 1 : view.year}
                month={(view.month + offset) % 12}
                today={today}
                checkIn={checkIn}
                checkOut={checkOut}
                previewEnd={previewEnd}
                minEnd={minCheckOut}
                nudge={flash}
                onPick={pick}
                onHover={setHover}
              />
            ))}
          </div>

          <div className="stay-cal-foot">
            <span className={`stay-cal-policy${flash ? ' is-flash' : ''}`} role="status" aria-live="polite">
              {flash ? (
                <>
                  <b>{minNights}-night minimum</b> — earliest check-out is {prettyDay(minCheckOut)}.
                </>
              ) : nights > 0 ? (
                `${nights} ${nights === 1 ? 'night' : 'nights'}`
              ) : minCheckOut ? (
                <>
                  {minNights}-night minimum · earliest check-out <b>{prettyShort(minCheckOut)}</b>
                </>
              ) : (
                `${minNights}-night minimum`
              )}
            </span>
            <div className="stay-cal-actions">
              {(checkIn || checkOut) && (
                <button type="button" className="stay-cal-clear" onClick={clear}>Clear</button>
              )}
              <button type="button" className="stay-cal-done" onClick={() => setOpen(false)} disabled={!checkIn || !checkOut}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MonthProps {
  year: number;
  month: number;
  today: string;
  checkIn: string;
  checkOut: string;
  previewEnd: string;
  /** Earliest legal check-out, marked with a small dot under the number. */
  minEnd: string;
  /** True for ~2.6s after a too-short check-out was tapped. */
  nudge: boolean;
  onPick: (iso: string) => void;
  onHover: (iso: string) => void;
}

function Month({ year, month, today, checkIn, checkOut, previewEnd, minEnd, nudge, onPick, onHover }: MonthProps) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoOf(year, month, i + 1)),
  ];

  const rangeEnd = checkOut || previewEnd;

  return (
    <div className="stay-cal-month">
      <div className="stay-cal-week">
        {WEEKDAYS.map((day, i) => <span key={`${day}-${i}`}>{day}</span>)}
      </div>
      <div className="stay-cal-days">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`blank-${i}`} className="stay-day is-blank" />;
          const past = iso < today;
          const isStart = iso === checkIn;
          const isEnd = iso === checkOut || (!checkOut && iso === previewEnd);
          const inRange = Boolean(checkIn && rangeEnd && iso > checkIn && iso < rangeEnd);
          const isMinEnd = Boolean(minEnd && !checkOut && iso === minEnd);
          const classes = [
            'stay-day',
            past ? 'is-past' : '',
            isStart ? 'is-start' : '',
            isEnd ? 'is-end' : '',
            inRange ? 'is-between' : '',
            iso === today ? 'is-today' : '',
            isMinEnd ? 'is-min-end' : '',
            isMinEnd && nudge ? 'is-nudge' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={iso}
              type="button"
              className={classes}
              disabled={past}
              aria-label={prettyShort(iso)}
              aria-pressed={isStart || isEnd}
              onClick={() => onPick(iso)}
              onMouseEnter={() => onHover(iso)}
              data-date={iso}
            >
              {Number(iso.slice(-2))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
