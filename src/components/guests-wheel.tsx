import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
 * Guests picker — a single iPhone-alarm style drum wheel (1 to max) with typing
 * built in: tap the centre number (or the keyboard icon) and the selected row
 * turns into a number field.
 *
 * How it works
 *   - Native scrolling + CSS scroll-snap does the momentum and the snapping, so
 *     touch feels like the real thing on iOS and Android.
 *   - The drum curve (tilt, fade, lift of the centred row) is painted straight
 *     onto the row elements on every animation frame. Nothing re-renders while
 *     you scroll, which is what keeps it smooth.
 *   - The parent `value` only changes when the centred row changes.
 *   - Desktop: one mouse-wheel notch moves one row, and you can drag with the
 *     mouse. Keyboard: arrows, PageUp/PageDown, Home/End, digits, Enter to type.
 *
 * Keep ITEM height in sync with --wheel-item-h in index.css (it is measured
 * from the DOM, so a responsive change there is picked up automatically).
 * --------------------------------------------------------------------------- */

const DEG_PER_ROW = 24; // how far each row tilts away from the centre
const MAX_TILT_DEG = 80;
const MOUSE_NOTCH_PX = 50; // wheel deltas this big count as one mouse notch
const TRACKPAD_STEP_PX = 40; // small deltas (trackpads) accumulate to this per row

export interface GuestsWheelProps {
  /** '' when nothing has been chosen yet. */
  value: string;
  onChange: (value: string) => void;
  max: number;
  /** id for the typed field — the form's <label> points at it. */
  inputId?: string;
}

function haptic() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(6);
  } catch {
    // vibration may be blocked; ignore
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function GuestsWheel({ value, onChange, max, inputId }: GuestsWheelProps) {
  // Deliberately not useId(): the home page is prerendered at build time and
  // hydrated by a different React tree (prerender mounts the page directly,
  // the client mounts it inside App's router), so useId() hands out different
  // values on the two sides and hydration fails. The form always passes the
  // field id, which is unique on the page, so derive stable ids from it.
  const wheelId = `${inputId ?? 'guests'}-wheel`;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const itemH = useRef(36); // measured row height in px
  const rowRef = useRef(0); // 0-based row currently centred (row 0 = 1 guest)
  const lockRef = useRef<number | null>(null); // row we are gliding to programmatically
  const pendingRowRef = useRef<number | null>(null); // row a wheel notch is heading to
  const rafRef = useRef<number | null>(null);
  const draggedRef = useRef(false);
  const typeBufferRef = useRef('');
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest props, readable from listeners that are only attached once.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const maxRef = useRef(max);
  maxRef.current = max;

  const clampRow = useCallback((row: number) => {
    const safe = Number.isFinite(row) ? Math.round(row) : 0;
    return Math.max(0, Math.min(maxRef.current - 1, safe));
  }, []);

  /* Paint the drum: tilt, fade and lift every row from the live scroll offset. */
  const paint = useCallback((top: number) => {
    const H = itemH.current;
    const pos = top / H;
    const centre = Math.round(pos);
    const radius = H / ((DEG_PER_ROW * Math.PI) / 180);

    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = i - pos;
      const ad = Math.abs(d);
      const deg = Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, d * DEG_PER_ROW));
      // Rows on a cylinder sit closer together than they do in a flat list.
      const dy = radius * Math.sin((deg * Math.PI) / 180) - d * H;
      const lift = 1 + 0.14 * Math.max(0, 1 - ad);

      el.style.transform = `perspective(420px) translateY(${dy.toFixed(2)}px) rotateX(${(-deg).toFixed(2)}deg) scale(${lift.toFixed(3)})`;
      el.style.opacity = Math.max(0, 1 - ad * 0.34).toFixed(3);
      el.classList.toggle('is-center', i === centre);
    });
  }, []);

  const goToRow = useCallback((row: number, smooth: boolean) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const top = row * itemH.current;
    const animate = smooth && !prefersReducedMotion();
    if (!animate) {
      // Assign scrollTop instead of scrollTo(..., 'auto'): a glide that is still
      // running can win over an automatic scroll and leave the drum between two
      // rows. A direct assignment cancels it and lands exactly on the row.
      scroller.scrollTop = top;
      paint(top);
      return;
    }
    // While we glide, intermediate rows must not be reported to the parent
    // (that would overwrite what the visitor is typing).
    if (Math.abs(scroller.scrollTop - top) > 1) lockRef.current = row;
    scroller.scrollTo({ top, behavior: 'smooth' });
  }, [paint]);

  /* Pick a party size: tell the parent and glide the wheel there. */
  const commit = useCallback(
    (guests: number) => {
      const row = clampRow(guests - 1);
      rowRef.current = row;
      haptic();
      onChangeRef.current(String(row + 1));
      goToRow(row, true);
    },
    [clampRow, goToRow],
  );

  /* Turn the centre row into a number field. Focus happens inside the user's tap,
     so mobile keyboards open reliably. */
  const openEditor = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    el.select();
  };

  /* Leaving the field has to land the drum on the typed row. Typing glides there
     smoothly, and a click anywhere else cancels that glide where it stands — the
     wheel would rest between two numbers and the value on screen would not be the
     value in the form. So snap to it outright whenever the field closes. */
  const closeEditor = useCallback(() => {
    setEditing(false);
    // Read the field itself: clicking away lands the blur in the same tick as the
    // last keystroke, before the parent has committed the new value, so a value
    // captured in this closure would still be the previous one.
    const digits = (editorRef.current?.value ?? value).replace(/\D/g, '');
    const typed = digits === '' ? 0 : Math.max(1, Math.min(max, parseInt(digits, 10)));
    if (typed > 0) onChange(String(typed));
    const row = clampRow((typed > 0 ? typed : 1) - 1);
    rowRef.current = row;
    lockRef.current = null;
    pendingRowRef.current = null;
    goToRow(row, false);
  }, [clampRow, goToRow, max, onChange, value]);

  const stepBy = (delta: number) => {
    const current = value === '' ? 0 : Number(value) || 0;
    commit(Math.max(1, Math.min(max, current + delta)));
  };

  /* First paint + keep geometry right if the row height changes (responsive CSS). */
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const measure = () => {
      const first = itemRefs.current[0];
      if (first && first.offsetHeight) itemH.current = first.offsetHeight;
    };
    measure();

    const startGuests = value === '' ? 1 : Number(value);
    rowRef.current = clampRow(startGuests - 1);
    scroller.scrollTop = rowRef.current * itemH.current;
    paint(scroller.scrollTop);

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      measure();
      scroller.scrollTop = rowRef.current * itemH.current;
      paint(scroller.scrollTop);
    });
    ro.observe(scroller);
    return () => ro.disconnect();
    // Runs once on purpose; later value changes go through the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Rows were added/removed (max changed): repaint. */
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) paint(scroller.scrollTop);
  }, [max, paint]);

  /* Scroll, wheel and touch listeners (attached once). */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let endTimer: ReturnType<typeof setTimeout> | null = null;
    let acc = 0;

    const releaseLock = () => {
      lockRef.current = null;
    };

    const commitRow = (row: number) => {
      if (row === rowRef.current) return;
      rowRef.current = row;
      haptic();
      onChangeRef.current(String(row + 1));
    };

    /* Called when the drum comes to rest (scrollend, or 140ms without a scroll
       event). Reporting the row only here — never mid-scroll — is what keeps a
       typed value safe: a glide that stops between two numbers used to report
       its neighbour and overwrite what the visitor had just typed. */
    const settle = () => {
      const h = itemH.current;
      const top = scroller.scrollTop;
      const nearest = clampRow(top / h);
      const target = pendingRowRef.current ?? lockRef.current;
      lockRef.current = null;
      pendingRowRef.current = null;
      acc = 0;

      if (Math.abs(top - nearest * h) > 1.5) {
        // Resting between two rows, i.e. a glide that never finished (a click
        // elsewhere cancels a smooth scroll). Finish it onto the row it was
        // heading for, and report nothing: committing the nearest row here is
        // what used to replace a typed number with its neighbour.
        const row = target ?? rowRef.current;
        scroller.scrollTop = row * h;
        paint(row * h);
        return;
      }
      commitRow(nearest);
    };

    const onScroll = () => {
      const top = scroller.scrollTop;

      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          paint(scroller.scrollTop);
        });
      }

      // The glide reached its target row: stop suppressing scroll reports.
      if (lockRef.current !== null && Math.abs(top - lockRef.current * itemH.current) < 1.5) {
        lockRef.current = null;
      }

      if (endTimer) clearTimeout(endTimer);
      endTimer = setTimeout(settle, 140); // fallback for browsers without `scrollend`
    };

    /* One mouse-wheel notch = one row. Trackpads accumulate small deltas. */
    const onWheel = (event: WheelEvent) => {
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const dir = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      if (dir === 0) return;

      const base = pendingRowRef.current ?? rowRef.current;
      const atEdge = (dir > 0 && base >= maxRef.current - 1) || (dir < 0 && base <= 0);
      if (atEdge) return; // let the page scroll on instead of trapping it

      event.preventDefault();
      lockRef.current = null;

      let steps = 0;
      if (Math.abs(delta) >= MOUSE_NOTCH_PX) {
        steps = dir;
        acc = 0;
      } else {
        if (Math.sign(acc) !== dir) acc = 0;
        acc += delta;
        if (Math.abs(acc) >= TRACKPAD_STEP_PX) {
          steps = dir;
          acc = 0;
        }
      }
      if (steps === 0) return;

      const target = clampRow(base + steps);
      if (target === base) return;
      pendingRowRef.current = target;
      scroller.scrollTo({
        top: target * itemH.current,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('scrollend', settle as EventListener, { passive: true });
    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('touchstart', releaseLock, { passive: true });
    scroller.addEventListener('pointerdown', releaseLock, { passive: true });

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('scrollend', settle as EventListener);
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchstart', releaseLock);
      scroller.removeEventListener('pointerdown', releaseLock);
      if (endTimer) clearTimeout(endTimer);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [clampRow, paint]);

  /* Value changed from outside the wheel (typed field, form reset). */
  useEffect(() => {
    const guests = value === '' ? 1 : Number(value);
    if (!Number.isFinite(guests)) return;
    const row = clampRow(guests - 1);
    if (row === rowRef.current) return; // the wheel itself caused this change
    rowRef.current = row;
    // Place the drum on the typed row at once. A glide would still be running
    // when the visitor clicks away, and that click cancels it mid-row.
    goToRow(row, !editing);
  }, [value, max, clampRow, goToRow, editing]);

  useEffect(
    () => () => {
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    },
    [],
  );

  /* Mouse drag (touch already scrolls natively). */
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const startY = event.clientY;
    const startTop = scroller.scrollTop;
    let moved = false;

    scroller.style.scrollSnapType = 'none'; // free drag; snapping resumes on release
    scroller.classList.add('is-dragging');

    const onMove = (e: PointerEvent) => {
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) > 4) moved = true;
      if (moved) scroller.scrollTop = startTop - dy;
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      scroller.classList.remove('is-dragging');
      scroller.style.scrollSnapType = '';

      if (moved) {
        draggedRef.current = true; // swallow the click that follows a drag
        setTimeout(() => {
          draggedRef.current = false;
        }, 0);
        const row = clampRow(scroller.scrollTop / itemH.current);
        scroller.scrollTo({
          top: row * itemH.current,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;

    if (/^\d$/.test(key)) {
      // Type-ahead: "1" then "2" within a moment = 12. Anything over max starts over.
      event.preventDefault();
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
      let next = typeBufferRef.current + key;
      if (Number(next) > max) next = key;
      typeBufferRef.current = next;
      const n = Number(next);
      if (n >= 1) commit(n);
      typeTimerRef.current = setTimeout(() => {
        typeBufferRef.current = '';
      }, 900);
      return;
    }

    if (key === 'Enter') {
      event.preventDefault();
      openEditor();
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      stepBy(-1);
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      stepBy(1);
    } else if (key === 'PageUp') {
      event.preventDefault();
      stepBy(-5);
    } else if (key === 'PageDown') {
      event.preventDefault();
      stepBy(5);
    } else if (key === 'Home') {
      event.preventDefault();
      commit(1);
    } else if (key === 'End') {
      event.preventDefault();
      commit(max);
    }
  };

  const handleTyped = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits === '') {
      onChange('');
      return;
    }
    const n = Math.max(1, Math.min(max, parseInt(digits, 10)));
    onChange(String(n));
  };

  const activeGuests = value === '' ? 0 : Math.max(1, Math.min(max, Number(value) || 0));

  const srOnly: React.CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  };

  return (
    <div className="guest-picker">
      <div className="guest-wheel-container">
        <div className={`guest-wheel${value === '' ? ' is-unset' : ''}${editing ? ' is-editing' : ''}`}>
          <div
            ref={scrollerRef}
            id={wheelId}
            className="guest-wheel-scroller"
            role="listbox"
            aria-label={`Number of guests — scroll the wheel, or type 1 to ${max}`}
            aria-activedescendant={activeGuests ? `${wheelId}-opt-${activeGuests - 1}` : undefined}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
          >
            {Array.from({ length: max }, (_, i) => (
              <div
                key={i}
                id={`${wheelId}-opt-${i}`}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                // Never put dynamic classes here: `is-center`, transform and opacity are
                // painted directly onto the element while scrolling.
                className="guest-wheel-item"
                role="option"
                aria-selected={activeGuests === i + 1}
                onClick={() => {
                  if (draggedRef.current) return;
                  // Tapping the number that is already chosen lets you type instead.
                  if (value !== '' && i === rowRef.current) openEditor();
                  else commit(i + 1);
                }}
              >
                <span className="wheel-num">{i + 1}</span>
                <span className="wheel-unit">{i === 0 ? 'guest' : 'guests'}</span>
              </div>
            ))}
          </div>

          {/* Selection lens over the centre row */}
          <div className="guest-wheel-band" aria-hidden="true" />

          <button type="button" className="guest-wheel-edit" aria-label="Type the number of guests" onClick={openEditor}>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2.5" y="6" width="19" height="12" rx="2" />
              <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9" />
            </svg>
          </button>

          {/* Always mounted (so the form label and tests can find it) but only shown
              while editing. It lives over the centre row, like the iOS alarm. */}
          <input
            ref={editorRef}
            id={inputId}
            className={`guest-wheel-editor${editing ? ' is-open' : ''}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder={`1–${max}`}
            aria-label={`Number of guests — type 1 to ${max}`}
            tabIndex={editing ? 0 : -1}
            value={value}
            onChange={(event) => handleTyped(event.target.value)}
            onFocus={() => setEditing(true)}
            onBlur={closeEditor}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                event.preventDefault(); // Enter must not submit the enquiry form
                closeEditor();
                scrollerRef.current?.focus();
              }
            }}
            data-testid="input-guests"
          />
        </div>

        <span style={srOnly} aria-live="polite">
          {value ? `${value} ${Number(value) === 1 ? 'guest' : 'guests'} selected` : ''}
        </span>
      </div>
    </div>
  );
}
