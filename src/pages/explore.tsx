import type { ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, MapPin, Music2, Sun } from 'lucide-react';

import { SiteShell } from '@/components/site-shell';
import { MAPS_SHARE_URL, WA_GENERAL } from '@/site-info';

interface ExploreList {
  icon: ReactNode;
  title: string;
  intro: string;
  items: [name: string, note: string][];
}

const LISTS: ExploreList[] = [
  {
    icon: <Music2 size={18} />,
    title: 'Dining & clubs',
    intro: 'Book the good tables a few days out — North Goa fills up fast.',
    items: [
      ['Thalassa', 'Greek plates on the Anjuna cliffside — reserve ahead'],
      ['Gunpowder', 'modern South Indian, Assagao'],
      ['Curlies', 'the beach-shack institution, Anjuna'],
      ['Hilltop Goa', 'open-air nights, Vagator'],
      ['Antares', 'beach club, Little Vagator'],
    ],
  },
  {
    icon: <MapPin size={18} />,
    title: 'Sights & scenery',
    intro: 'Nothing on this list is more than about twenty minutes from the gate.',
    items: [
      ['Chapora Fort', 'sunset point over Vagator'],
      ['Anjuna, Ashwem & Morjim', 'the nearest beaches'],
      ["Fontainhas", 'Panaji\u2019s Latin quarter'],
      ['Siolim riverfront & Chapora backwaters', 'quiet early-morning paddles'],
      ["Assagao's boutiques and cafés", 'a lazy afternoon loop'],
    ],
  },
  {
    icon: <Sun size={18} />,
    title: 'To do in Goa',
    intro: 'Slow days — nothing here needs a schedule.',
    items: [
      ['Wednesday flea market', 'Anjuna, sunrise-till-dusk'],
      ['Water sports', 'at Baga & Candolim'],
      ['Spice plantation tour', 'out towards Ponda'],
      ['Sunset cruise', 'on the Mandovi'],
      ['Early-morning yoga', 'in Assagao'],
    ],
  },
];

/**
 * /explore — "what to do around here" on its own page: the villa team's
 * curated lists, drive times, and how to get today's favourites.
 */
export default function Explore() {
  return (
    <SiteShell>
      <header className="explore-hero">
        <div className="container-wide">
          <div className="eyebrow" style={{ color: '#e5a185' }}>Beyond the gate</div>
          <h1 className="display-font explore-title">Around<br /><em>the house.</em></h1>
          <p className="explore-lede">The house sits in the quiet part of North Goa — beaches, restaurants, forts and markets all a short drive away. Here's where we'd point you first.</p>
          <div className="explore-distance" aria-label="Drive times from the villa">
            <span>Anjuna · 15 min</span><span>Vagator · 20 min</span><span>Assagao · 12 min</span><span>Mopa Airport · 50 min</span>
          </div>
        </div>
      </header>

      <section className="section-tight">
        <div className="container-wide">
          <div className="explore-cards">
            {LISTS.map((list) => (
              <article className="explore-card reveal" key={list.title}>
                <div className="experience-head">{list.icon}<h3>{list.title}</h3></div>
                <p className="explore-card-intro">{list.intro}</p>
                <ul>
                  {list.items.map(([name, note]) => <li key={name}><strong>{name}</strong> — {note}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark explore-cta">
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ color: '#e5a185' }}>Because it changes</div>
          <h2 className="display-font section-title">The list keeps<br /><em>moving.</em></h2>
          <p className="story-copy" style={{ margin: '0 auto 28px' }}>Peak-season tables book out weeks ahead, the flea market follows the season, and the team knows exactly what's good right now. Ask when you book — we'll send the latest picks.</p>
          <div className="cta-row">
            <a className="nav-cta" href={WA_GENERAL} target="_blank" rel="noreferrer" data-testid="link-explore-whatsapp">Get today's favourites <ArrowRight size={15} /></a>
            <a className="outline-button" href={MAPS_SHARE_URL} target="_blank" rel="noreferrer" data-testid="link-explore-maps">Open the map <ArrowUpRight size={15} /></a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
