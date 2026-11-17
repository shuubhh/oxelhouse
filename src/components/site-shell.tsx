import { useState, type ReactNode } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

import { WA_GENERAL } from '@/site-info';

const NAV_ITEMS = [
  { href: '/', label: 'Home', testid: 'link-nav-home' },
  { href: '/gallery', label: 'Gallery', testid: 'link-nav-gallery' },
  { href: '/explore', label: 'Explore', testid: 'link-nav-explore' },
];

/**
 * Shared chrome for every page: top navigation, footer and floating WhatsApp
 * button. Home places SiteNav inside its own hero header (overlay variant);
 * gallery & explore use SiteShell, which renders the solid variant on top of
 * the page. All links are plain anchors — every page is prerendered with its
 * own static HTML, so full loads land instantly and server/client markup
 * stays identical (no router context needed inside the shell).
 */
export function SiteNav({ variant = 'overlay', ctaHref = '/#enquire' }: { variant?: 'overlay' | 'page'; ctaHref?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <nav className={variant === 'page' ? 'page-nav' : 'hero-nav'} aria-label="Primary navigation">
      <div className="container-wide hero-nav-inner">
        <a className="brand-mark" href="/" data-testid="link-brand-home">
          <span className="brand-symbol">O</span>
          <span className="brand-name">Oxel House Goa</span>
        </a>
        <div className="nav-links">
          {NAV_ITEMS.map((item) => <a key={item.href} href={item.href} data-testid={item.testid}>{item.label}</a>)}
          <a className="nav-cta" href={ctaHref} data-testid="link-nav-cta">Check dates <ArrowRight size={15} /></a>
        </div>
        <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} data-testid="button-mobile-menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        {menuOpen && (
          <div className="mobile-menu">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} onClick={closeMenu} data-testid={item.testid.replace('link-nav', 'link-mobile')}>{item.label}</a>
            ))}
            <a href={ctaHref} onClick={closeMenu} data-testid="link-mobile-enquire">Enquire for rates</a>
          </div>
        )}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container-wide">
        <div className="footer-grid">
          <div>
            <a className="brand-mark" href="/" data-testid="link-footer-home">
              <span className="brand-symbol">O</span>
              <span className="brand-name">Oxel House Goa</span>
            </a>
            <p className="footer-copy" style={{ marginTop: 20 }}>A private 7-bedroom villa in Oxel, Siolim, North Goa. A little more space for the good things.</p>
          </div>
          <div>
            <div className="eyebrow" style={{ color: '#e5a185' }}>In the neighbourhood</div>
            <p className="footer-copy" style={{ marginTop: 12 }}>Siolim · Anjuna · Assagao<br />North Goa, India</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© Oxel House Goa</span>
          <span>Direct enquiries · Rates on request</span>
        </div>
      </div>
    </footer>
  );
}

export function FloatingWhatsApp() {
  return (
    <a className="floating-whatsapp" href={WA_GENERAL} target="_blank" rel="noreferrer" aria-label="Chat with Oxel House on WhatsApp" data-testid="button-floating-whatsapp">
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" fill="currentColor"><path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.1.6 4.1 1.6 5.9L4 29l8.4-1.6c1.7.9 3.6 1.4 5.6 1.4h.1c6.6 0 11.9-5.3 11.9-11.9C30 8.3 22.6 3 16 3zm6.9 16.9c-.3.8-1.7 1.6-2.3 1.6-.6.1-1.4.1-2.2-.1-.5-.2-1.2-.4-2-.8-3.5-1.5-5.8-5-6-5.2-.2-.3-1.4-1.9-1.4-3.6 0-1.7.9-2.6 1.2-2.9.3-.3.7-.4 1-.4h.7c.2 0 .5-.1.8.6.3.8 1.1 2.6 1.2 2.8.1.2.2.4 0 .7-.1.3-.2.4-.4.7-.2.2-.4.5-.6.6-.2.2-.4.4-.2.8.2.4 1 1.7 2.2 2.7 1.5 1.3 2.8 1.7 3.2 1.9.4.2.6.2.9-.1.2-.3 1-1.1 1.2-1.5.3-.4.5-.3.9-.2.4.1 2.3 1.1 2.7 1.3.4.2.7.3.7.5.1.1.1.9-.2 1.6z"/></svg>
    </a>
  );
}

/** Full page shell for the sub-pages (gallery, explore). */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <SiteNav variant="page" />
      <main>{children}</main>
      <SiteFooter />
      <FloatingWhatsApp />
    </div>
  );
}
