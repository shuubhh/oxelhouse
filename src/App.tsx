import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { FloatingWhatsApp, SiteFooter, SiteNav } from '@/components/site-shell';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Explore from '@/pages/explore';
import Gallery from '@/pages/gallery';
import NotFound from '@/pages/not-found';
import PhotoTable from '@/components/photo-table';
import { GuestsWheel } from '@/components/guests-wheel';
import { StayCalendar } from '@/components/stay-calendar';
import { MAPS_EMBED_SRC, MAPS_SHARE_URL, MAX_GUESTS, WA_ENQUIRY_INTRO, waUrl } from '@/site-info';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bath, BedDouble, CalendarDays, Check,
  ChevronDown, CircleParking, Clock3, CreditCard, Home as HomeIcon, MapPin,
  MonitorPlay, Music2, PawPrint, Send, ShieldCheck, Sparkles, Sun,
  Users, Utensils, Wifi,
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function prettyDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Local-date arithmetic on ISO yyyy-mm-dd strings (avoids UTC off-by-one for IST). */
function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

interface EnquiryDetails {
  checkIn: string;
  checkOut: string;
  guests?: number;
  name: string;
  email?: string;
  phone?: string;
  occasion?: string;
  message?: string;
}

function buildWhatsAppMessage(details: EnquiryDetails): string {
  const nights = details.checkOut > details.checkIn
    ? Math.round((Date.parse(`${details.checkOut}T00:00:00`) - Date.parse(`${details.checkIn}T00:00:00`)) / 86400000)
    : 0;
  const lines = [
    WA_ENQUIRY_INTRO,
    `• Dates: ${prettyDate(details.checkIn)} → ${prettyDate(details.checkOut)} (${nights} ${nights === 1 ? 'night' : 'nights'})`,
    `• Name: ${details.name}`,
  ];
  if (details.guests) lines.splice(2, 0, `• Guests: ${details.guests}`);
  if (details.phone) lines.push(`• Phone: ${details.phone}`);
  if (details.email) lines.push(`• Email: ${details.email}`);
  if (details.occasion) lines.push(`• Occasion: ${details.occasion}`);
  if (details.message) lines.push(`• Note: ${details.message}`);
  return lines.join('\n');
}

// Exported for the build-time prerender step (scripts/prerender.mjs), which
// renders this page to static HTML. Home uses no router hooks, so it renders
// identically on server and client — hydrating cleanly.
export function Home() {
  const [submitted, setSubmitted] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [form, setForm] = useState({
    checkIn: '', checkOut: '', guests: '', name: '', phone: '', email: '', occasion: '', message: '',
  });
  const today = useMemo(() => {
    const dt = new Date();
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }, []);
  // The stay dates come from one calendar: pick check-in, then check-out. The
  // range picker enforces the two-night minimum and closes once both are set.
  const handleStayDates = ({ checkIn, checkOut }: { checkIn: string; checkOut: string }) => {
    setSubmitted(false);
    setFormError('');
    setForm((current) => ({ ...current, checkIn, checkOut }));
  };
  const updateForm = (key: keyof typeof form, value: string) => {
    setSubmitted(false);
    setFormError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.checkIn || !form.checkOut) {
      setFormError('Please choose your check-in and check-out dates.');
      return;
    }
    const minOutIso = addDaysIso(form.checkIn, 2); // two-night minimum
    if (form.checkOut < minOutIso) {
      setFormError('We keep a two-night minimum — set check-out at least two nights after check-in.');
      return;
    }
    if (form.name.trim().length < 2) {
      setFormError('Please tell us your name.');
      return;
    }
    const url = waUrl(buildWhatsAppMessage({
      checkIn: form.checkIn, checkOut: form.checkOut,
      guests: form.guests ? Number(form.guests) : undefined,
      name: form.name.trim(), phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      occasion: form.occasion.trim() || undefined, message: form.message.trim() || undefined,
    }));
    // Opening inside the submit handler keeps it a user gesture, so popup
    // blockers allow it; the success screen also shows a manual link.
    setWhatsappUrl(url);
    window.open(url, '_blank', 'noopener');
    setSubmitted(true);
    setForm((current) => ({ ...current, name: '', phone: '', email: '', occasion: '', message: '' }));
  };

  return (
    <div className="site-shell">
      <header className="hero-wrap" id="top">
        <div className="hero-image" aria-hidden="true" />
        <SiteNav variant="overlay" ctaHref="#enquire" />
        <div className="container-wide hero-content reveal">
          <div className="eyebrow" style={{ color: '#e5a185' }}>Oxel · Siolim · North Goa</div>
          <h1 className="display-font hero-title">Feels like<br />home.</h1>
          <p className="hero-subtitle"><strong>A 7-bedroom villa with its own pool, about 15 minutes from Anjuna and Assagao.</strong> Made for long lunches, slow mornings and the people you came to be with.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 31 }}>
            <a href="#enquire" className="nav-cta" data-testid="link-hero-enquire">Enquire for rates <ArrowRight size={15} /></a>
            <a href="#the-house" className="outline-button" data-testid="link-hero-explore">Walk through the house <ArrowDown size={15} /></a>
          </div>
          <div className="hero-meta">
            <span><HomeIcon size={15} /> Private villa</span><span><BedDouble size={15} /> 7 en-suite rooms</span><span><Users size={15} /> Up to {MAX_GUESTS} guests</span>
          </div>
        </div>
      </header>

      <main>
        <section className="section" id="the-house">
          <div className="container-wide intro-grid">
            <div className="reveal">
              <div className="eyebrow">A home, not a hotel</div>
              <h2 className="display-font section-title">Room to be<br /><em>together.</em></h2>
              <div className="intro-rule" />
              <p className="intro-lede">A seven-bedroom home in a quiet corner of Siolim — for the rare pleasure of having nowhere else to be.</p>
              <p className="muted-copy">Five thousand square feet of house, four hundred of garden. Families and small groups get the privacy of a real home, kept and cared for like a good hotel.</p>
            </div>
            <figure className="image-frame intro-image reveal" style={{ animationDelay: '.12s' }}>
              <img src="/oxel-pool.jpg" alt="Private pool surrounded by tropical gardens at Oxel House" data-testid="img-pool" />
              <figcaption className="image-caption">The pool · a quiet centre of gravity</figcaption>
            </figure>
          </div>
        </section>

        <section className="section-tight section-cream">
          <div className="container-wide"><div className="stat-strip" aria-label="Villa highlights">
            <div className="stat" data-testid="stat-space"><div className="stat-value">5,000+</div><div className="stat-label">sq. ft. of living space</div></div>
            <div className="stat" data-testid="stat-garden"><div className="stat-value">400</div><div className="stat-label">sqm of tropical gardens</div></div>
            <div className="stat" data-testid="stat-pool"><div className="stat-value">26 × 12</div><div className="stat-label">ft. private pool</div></div>
            <div className="stat" data-testid="stat-rooms"><div className="stat-value">7</div><div className="stat-label">air-conditioned en-suite rooms</div></div>
          </div></div>
        </section>

        <section className="section section-dark" id="dining">
          <div className="container-wide dining-layout">
            <div className="reveal">
              <div className="eyebrow" style={{ color: '#e5a185' }}>Dining at the house</div>
              <h2 className="display-font section-title">The table is<br /><em>the heart of it.</em></h2>
              <p className="story-copy">Breakfast stretches into lunch, lunch into evening. Cook together in the kitchen — or let us point you to home chefs who deliver. Meals here are long, easy and never rushed.</p>
            </div>
            <div className="dining-grid">
              <article className="dining-card reveal" style={{ animationDelay: '.05s' }}><Utensils size={19} /><h3>8-seater dining &amp; bar table</h3><p>Where everyone drifts eventually: slow dinners, card games, conversations that run past midnight.</p></article>
              <article className="dining-card reveal" style={{ animationDelay: '.12s' }}><Sparkles size={19} /><h3>Modular kitchen</h3><p>Cook if you feel like it. If you'd rather not, the team knows home chefs who will.</p></article>
              <article className="dining-card reveal" style={{ animationDelay: '.19s' }}><Sun size={19} /><h3>Alfresco by the pool</h3><p>Chairs under the trees — morning chai, evening sundowners, everything in between.</p></article>
              <article className="dining-card reveal" style={{ animationDelay: '.26s' }}><MonitorPlay size={19} /><h3>Lounge movie nights</h3><p>A 65-inch screen for match days, film nights and one more episode.</p></article>
            </div>
          </div>
        </section>

        <section className="section" id="beyond-the-gate">
          <div className="container-wide teaser-layout">
            <div>
              <div className="eyebrow">Beyond the gate</div>
              <h2 className="display-font section-title">The neighbourhood,<br /><em>curated.</em></h2>
              <p className="muted-copy">The house sits in the quiet part of North Goa — the beaches, restaurants and markets you came for are about 15 minutes away. We keep the full list, with the team's current favourites, on one page.</p>
              <a className="nav-cta" href="/explore" data-testid="link-teaser-explore" style={{ marginTop: 26 }}>Things to do around the house <ArrowRight size={15} /></a>
            </div>
            <div className="teaser-cards">
              <article className="teaser-card" data-testid="teaser-dining"><Music2 size={18} /><h3>Dining &amp; clubs</h3><p>Thalassa · Gunpowder · Curlies · Hilltop · Antares</p></article>
              <article className="teaser-card" data-testid="teaser-visit"><MapPin size={18} /><h3>Sights &amp; scenery</h3><p>Chapora Fort · Anjuna &amp; Morjim · Fontainhas · Siolim backwaters</p></article>
              <article className="teaser-card" data-testid="teaser-todo"><Sun size={18} /><h3>To do in Goa</h3><p>Anjuna flea market · water sports · spice tour · sunset cruise · yoga</p></article>
            </div>
          </div>
        </section>

        <section className="section section-cream" id="location">
          <div className="container-wide location-layout">
            <div className="reveal">
              <div className="eyebrow">Location</div>
              <h2 className="display-font section-title">Quiet Siolim,<br /><em>close to it all.</em></h2>
              <p className="muted-copy">The house sits in Oxel, the calm edge of Siolim — about fifteen minutes from Anjuna, Vagator and Assagao, and under an hour from the airport.</p>
              <div className="location-distance"><span>Anjuna · 15 min</span><span>Vagator · 20 min</span><span>Assagao · 12 min</span><span>Mopa Airport · 50 min</span></div>
              <a className="nav-cta" href={MAPS_SHARE_URL} target="_blank" rel="noreferrer" style={{ marginTop: 26 }} data-testid="link-open-maps">Open in Google Maps <ArrowUpRight size={15} /></a>
            </div>
            <div className="map-frame reveal" style={{ animationDelay: '.1s' }}>
              <iframe
                title="Map — Oxel House, Siolim, North Goa"
                src={MAPS_EMBED_SRC}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        <section className="section section-cream" id="gallery">
          <div className="container-wide">
            <div className="photo-head">
              <div>
                <div className="eyebrow">Siolim, North Goa</div>
                <h2 className="display-font section-title">A pile of days<br /><em>at Oxel House.</em></h2>
              </div>
              <div>
                <p className="photo-lede">Pick up a photo, move it aside, toss it across the table — or flip through them one by one. The rest of the album hangs on the gallery page, as a wall calendar whose pages turn over.</p>
                <a className="nav-cta" href="/gallery" data-testid="link-teaser-gallery" style={{ marginTop: 16 }}>Open the gallery <ArrowRight size={15} /></a>
              </div>
            </div>
            <div data-testid="gallery-deck">
              <PhotoTable />
            </div>
          </div>
        </section>

        <section className="section" id="policy">
          <div className="container-wide">
            <div className="eyebrow">Good to know</div>
            <h2 className="display-font section-title">Villa policy.</h2>
            <div className="policy-grid">
              <PolicyCard icon={<Clock3 size={18} />} title="Check-in & check-out" copy="Check-in from 2 PM, check-out by 11 AM. Early arrivals and late departures on request — we'll do our best." />
              <PolicyCard icon={<CreditCard size={18} />} title="Identification" copy="Every adult shows a government photo ID at check-in. Foreign guests: passport with a valid India visa." />
              <PolicyCard icon={<Users size={18} />} title="Guests" copy={`The rate covers up to ${MAX_GUESTS} guests across the seven bedrooms. The house's calm is part of the stay, so visits from outside your group stay small and by arrangement.`} />
              <PolicyCard icon={<Music2 size={18} />} title="Noise & evenings" copy="The neighbours are lovely and we'd like to keep it that way. Evenings stay easy — quiet hours 10 PM to 8 AM." />
              <PolicyCard icon={<Sparkles size={18} />} title="Smoking" copy="Smoke outdoors only — ashtrays live in the garden." />
              <PolicyCard icon={<PawPrint size={18} />} title="Pets" copy="Pets welcome on request — tell us when you enquire and we'll be ready." />
              <PolicyCard icon={<ShieldCheck size={18} />} title="Safety" copy="CCTV covers common outdoor areas only. Bedrooms, bathrooms and the pool are entirely private." />
              <PolicyCard icon={<CalendarDays size={18} />} title="Bookings & damages" copy="Your booking is confirmed with the team on WhatsApp. Accidental damage is chargeable at cost — just tell us." />
            </div>
          </div>
        </section>

        <section className="section section-dark">
          <div className="container-wide story-grid">
            <div className="story-sticky reveal">
              <div className="eyebrow" style={{ color: '#e5a185' }}>The Oxel rhythm</div>
              <h2 className="display-font section-title">Goan<br /><em>susegado.</em></h2>
              <p className="story-copy">A feeling of ease. A slower pace. Breakfast when the day is already warm, a swim before lunch, a book in the shade while the rest of the house hums around you.</p>
            </div>
            <div><ul className="story-list">
              <li><span>Morning light</span><small>Open the doors to gardens and the softest start to the day.</small></li>
              <li><span>Long table dinners</span><small>Gather around the 8-seater dining and bar table, or cook together in the modular kitchen.</small></li>
              <li><span>Private by design</span><small>Your own pool, lounge, bedrooms and spaces to disappear into.</small></li>
              <li><span>Close to the North Goa you came for</span><small>Easy access to Anjuna and Assagao, then back to the quiet of Siolim.</small></li>
            </ul></div>
          </div>
        </section>

        <section className="section">
          <div className="container-wide">
            <div className="eyebrow">The spaces between</div>
            <h2 className="display-font section-title" style={{ maxWidth: 600 }}>Made for the way a good stay unfolds.</h2>
            <div className="feature-grid">
              <div className="feature-main image-frame reveal"><img src="/oxel-interior.jpg" alt="The family lounge at Oxel House, opening onto the pool" data-testid="img-lounge" /><div className="image-caption">The family lounge · opens onto the pool</div></div>
              <div className="feature-side">
                <article className="feature-tile"><span className="tile-number">01 / GATHER</span><div><h3 className="display-font" style={{ fontSize: '2rem', margin: '0 0 8px' }}>Your own<br />common ground.</h3><p>Movie nights, proper meals, slow afternoons. Rooms generous enough for everyone, without ever feeling formal.</p></div></article>
                <article className="feature-tile dark-tile"><span className="tile-number">02 / RETREAT</span><div><h3 className="display-font" style={{ fontSize: '2rem', margin: '0 0 8px' }}>Seven rooms.<br />No compromise.</h3><p>Seven air-conditioned en-suite bedrooms — everyone gets a door that closes, even when the house is full.</p></div></article>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-cream">
          <div className="container-wide amenities-layout">
            <div><div className="eyebrow">Everything considered</div><h2 className="display-font section-title">The useful<br /><em>luxuries.</em></h2><p className="muted-copy">Small things, quietly handled, from the moment you arrive.</p></div>
            <div className="amenity-grid">
              <Amenity icon={<BedDouble size={19} />} title="Seven en-suite bedrooms" copy="Air-conditioned, private and ready for long stays." />
              <Amenity icon={<Bath size={19} />} title="Organic toiletries" copy="Thoughtful essentials in every bathroom." />
              <Amenity icon={<Utensils size={19} />} title="Modular kitchen" copy="Fully equipped for breakfast, dinner and everything between." />
              <Amenity icon={<MonitorPlay size={19} />} title="Family lounge" copy="A 65-inch Smart TV for shared downtime." />
              <Amenity icon={<Wifi size={19} />} title="High-speed Wi-Fi" copy="Stay connected when you need to, switch off when you don't." />
              <Amenity icon={<CircleParking size={19} />} title="Parking" copy="Convenient on-property parking for your group." />
              <Amenity icon={<ShieldCheck size={19} />} title="CCTV & power backup" copy="Practical peace of mind throughout your stay." />
              <Amenity icon={<Sparkles size={19} />} title="24x7 hot water" copy="A small comfort, always available." />
            </div>
          </div>
        </section>

        <section className="section enquire-section" id="enquire">
          <div className="container-wide enquire-layout">
            <div className="reveal"><div className="eyebrow">Start with your dates</div><h2 className="display-font section-title">Let’s see if<br /><em>it fits.</em></h2><p className="intro-lede">Share your dates and we'll take it from there — availability and rates come straight back to you on WhatsApp.</p><div className="intro-rule" /><p className="muted-copy">The house suits families, groups of friends and teams on an offsite. It stays calm for everyone — families, teams and the neighbours included.</p></div>
            <div className="enquire-card">
              {submitted ? <div className="form-success" data-testid="status-inquiry-success"><Check size={19} style={{ verticalAlign: 'middle', marginRight: 7 }} />Your enquiry is ready in WhatsApp with your dates filled in. If it didn't open, tap below — the team replies there with availability and rates.{whatsappUrl && <><br /><a className="terracotta-button" style={{ color: '#fdf6e9', marginTop: 18 }} href={whatsappUrl} target="_blank" rel="noreferrer" data-testid="button-whatsapp">Open WhatsApp <Send size={15} /></a></>}<br /><button type="button" className="outline-button" style={{ color: '#31533f', marginTop: 18 }} onClick={() => setSubmitted(false)} data-testid="button-send-another">Send another enquiry</button></div> : (
                <form onSubmit={submitInquiry} noValidate>
                  <div className="booking-step-label"><span>01</span> Choose your stay</div>
                  <div className="form-grid">
                    <StayCalendar checkIn={form.checkIn} checkOut={form.checkOut} today={today} minNights={2} onChange={handleStayDates} />
                    <Field label="Guests" id="guests" full>
                      <GuestsWheel
                        inputId="guests"
                        value={form.guests}
                        onChange={(value) => updateForm('guests', value)}
                        max={MAX_GUESTS}
                      />
                    </Field>
                  </div>
                  <p className="form-hint">Two-night minimum · check-in from 2 PM, check-out by 11 AM</p>
                  <div className="booking-step-label booking-step-details"><span>02</span> Your details</div>
                  <div className="form-grid">
                    <Field label="Your name" id="name"><input id="name" type="text" placeholder="Name" minLength={2} value={form.name} onChange={(event) => updateForm('name', event.target.value)} required data-testid="input-name" /></Field>
                    <Field label="Phone (optional)" id="phone"><input id="phone" type="tel" placeholder="Phone number" minLength={7} value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} data-testid="input-phone" /></Field>
                  </div>
                  <button type="button" className="optional-toggle" onClick={() => setShowOptional((open) => !open)} aria-expanded={showOptional} data-testid="button-optional-fields">
                    <ChevronDown size={15} className={showOptional ? 'chevron-open' : ''} /> Add email, occasion or a note (optional)
                  </button>
                  {showOptional && (
                    <div className="form-grid optional-fields">
                      <Field label="Email (optional)" id="email"><input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(event) => updateForm('email', event.target.value)} data-testid="input-email" /></Field>
                      <Field label="Occasion (optional)" id="occasion"><input id="occasion" type="text" placeholder="Family holiday, offsite..." value={form.occasion} onChange={(event) => updateForm('occasion', event.target.value)} data-testid="input-occasion" /></Field>
                      <Field label="A note for the villa team (optional)" id="message" full><textarea id="message" placeholder="Anything that will help us understand your stay..." value={form.message} onChange={(event) => updateForm('message', event.target.value)} data-testid="input-message" /></Field>
                    </div>
                  )}
                  {formError && <p className="form-error" role="alert" data-testid="status-form-error">{formError}</p>}
                  <button className="terracotta-button" type="submit" style={{ marginTop: 20, width: '100%' }} data-testid="button-submit-inquiry">Send enquiry <Send size={15} /></button>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="section section-dark" style={{ padding: '96px 0 108px' }}><div className="container-narrow" style={{ textAlign: 'center' }}><div className="eyebrow" style={{ color: '#e5a185' }}>Come as you are</div><h2 className="display-font section-title">A house for the<br /><em>people you make time for.</em></h2><p className="story-copy" style={{ margin: '0 auto 28px' }}>Bring the whole family. Bring your closest friends. Bring the team that needs a week of clear thinking. The evenings here run long and easy.</p><a className="nav-cta" href="#enquire" data-testid="link-final-enquire">Enquire for your dates <ArrowRight size={15} /></a></div></section>
      </main>

      <SiteFooter />

      <FloatingWhatsApp />
    </div>
  );
}

function Field({ label, id, full, children }: { label: string; id: string; full?: boolean; children: ReactNode }) {
  return <div className={`field${full ? ' full' : ''}`}><label htmlFor={id}>{label}</label>{children}</div>;
}

function Amenity({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <div className="amenity" data-testid={`amenity-${title.toLowerCase().replaceAll(' ', '-')}`}>{icon}<div><h3>{title}</h3><p>{copy}</p></div></div>;
}

function PolicyCard({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <article className="policy-card">{icon}<div><h3>{title}</h3><p>{copy}</p></div></article>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/explore" component={Explore} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider>;
}

export default App;
