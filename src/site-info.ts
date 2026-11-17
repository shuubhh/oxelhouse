/**
 * Site-wide public constants and small helpers.
 *
 * Lives on its own module so every page imports it directly — importing from
 * App.tsx would create a circular dependency now that routes live there.
 */
// WhatsApp enquiries: international format, digits only (no +, spaces or dashes).
// (The public domain lives in index.html as absolute og:/canonical URLs.)
export const WHATSAPP_NUMBER = '918010261752';
export const MAX_GUESTS = 21;

export const LISTING_URL = 'https://sites.google.com/view/oxel-house-goa-siolim';
export const MAPS_SHARE_URL = 'https://maps.app.goo.gl/bUjr47qi38uwENYW7';
// Keyless embed pinned to the Oxel House coordinates (lat/lng from the Google
// place). Text-address embeds geocode "Oxel" as "Oshal" and pin the wrong spot;
// q=lat,lng(label) shows the right pin with the right name.
export const MAPS_EMBED_SRC =
  'https://www.google.com/maps?q=15.6363614,73.7734242(Oxel+House)&z=16&output=embed';

export function waUrl(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const WA_GENERAL = waUrl("Hi Oxel House team! I'd like to know more about the villa.");
export const WA_ENQUIRY_INTRO = 'Hi Oxel House team! I\'d like to enquire about a stay:';
