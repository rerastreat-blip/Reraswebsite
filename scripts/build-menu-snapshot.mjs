// Runs on every Netlify deploy (see netlify.toml). Fetches the live menu
// from ReraOS and writes it into menu.html as plain HTML plus schema.org
// Menu data, so search engines and AI crawlers see real dishes and prices
// instead of "Loading menu…", and visitors see the menu instantly while the
// live one loads.
//
// If the API can't be reached (e.g. the Render instance is asleep and
// doesn't wake in time), the snapshot already committed in menu.html is
// left as-is and the deploy carries on.
//
// Local use: MENU_JSON_FILE=path/to/menu.json node scripts/build-menu-snapshot.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const API_ORIGIN = 'https://reraos.onrender.com';
const MENU_URL = `${API_ORIGIN}/whatsapp-sessions/menu`;
const SITE_ORIGIN = 'https://rerastreat.com.ng';
const MENU_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'menu.html');

const SNAPSHOT_START = '<!-- MENU_SNAPSHOT:START -->';
const SNAPSHOT_END = '<!-- MENU_SNAPSHOT:END -->';
const SCHEMA_START = '<!-- MENU_SCHEMA:START -->';
const SCHEMA_END = '<!-- MENU_SCHEMA:END -->';

const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 60_000; // a sleeping Render instance can take ~50s to wake
const RETRY_DELAY_MS = 10_000;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNaira(amount) {
  return `&#8358;${Number(amount).toLocaleString('en-NG')}`;
}

function resolveImageUrl(p) {
  if (!p) return null;
  return p.startsWith('http') ? p : `${API_ORIGIN}${p}`;
}

async function fetchProducts() {
  if (process.env.MENU_JSON_FILE) {
    return JSON.parse(await readFile(process.env.MENU_JSON_FILE, 'utf8'));
  }

  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(MENU_URL, { signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || data.items || [];
    } catch (err) {
      lastError = err;
      console.warn(`[menu-snapshot] attempt ${attempt}/${ATTEMPTS} failed: ${err.message}`);
      // A waking Render instance can briefly answer 502/503; give it a moment.
      if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

// Same filtering and category grouping as loadMenu() in menu.html, so the
// snapshot matches what the live menu renders.
function groupByCategory(products) {
  const categories = new Map();
  for (const p of products) {
    if (p.status !== 'ACTIVE' || !p.isAvailable) continue;
    const category = p.category || { id: 'uncategorized', name: 'Other' };
    if (!categories.has(category.id)) categories.set(category.id, { name: category.name, items: [] });
    categories.get(category.id).items.push({
      name: p.name,
      desc: p.description || '',
      price: Number(p.price),
      servings: p.servings || '',
      image: resolveImageUrl(Array.isArray(p.images) && p.images.length ? p.images[0] : null),
    });
  }
  return [...categories.values()];
}

function renderSnapshot(categories) {
  const sections = categories.map((cat) => {
    const cards = cat.items.map((item) => {
      const thumbStyle = item.image
        ? ` style="background-image:url('${escapeHtml(item.image)}');background-color:var(--pale-g)"`
        : '';
      return [
        '      <div class="menu-card">',
        `        <div class="menu-thumb"${thumbStyle}></div>`,
        `        <h3 class="menu-name">${escapeHtml(item.name)}</h3>`,
        item.desc ? `        <div class="menu-desc">${escapeHtml(item.desc)}</div>` : '',
        item.servings ? `        <div class="menu-servings">Serves ${escapeHtml(item.servings)}</div>` : '',
        `        <div class="menu-foot"><div class="menu-price">${formatNaira(item.price)}</div></div>`,
        '      </div>',
      ].filter(Boolean).join('\n');
    });
    return [
      '  <section class="category-section">',
      `    <h2 class="category-title">${escapeHtml(cat.name)}</h2>`,
      '    <div class="menu-grid">',
      ...cards,
      '    </div>',
      '  </section>',
    ].join('\n');
  });

  return [
    '<div class="menu-snapshot" id="menuSnapshot">',
    '  <p class="menu-snapshot-note" id="menuLoadingState">Loading live menu…</p>',
    ...sections,
    '</div>',
  ].join('\n');
}

function renderSchema(categories) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: "Rera's Treat",
    url: SITE_ORIGIN,
    servesCuisine: ['Nigerian', 'Small chops', 'Finger food'],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ogijo',
      addressRegion: 'Ogun State',
      addressCountry: 'NG',
    },
    hasMenu: {
      '@type': 'Menu',
      name: "Rera's Treat Menu",
      url: `${SITE_ORIGIN}/menu.html`,
      hasMenuSection: categories.map((cat) => ({
        '@type': 'MenuSection',
        name: cat.name,
        hasMenuItem: cat.items.map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          ...(item.desc ? { description: item.desc } : {}),
          ...(item.image ? { image: item.image } : {}),
          offers: { '@type': 'Offer', price: item.price.toFixed(2), priceCurrency: 'NGN' },
        })),
      })),
    },
  };
  // "<" is escaped so a dish name can never close the script tag early.
  const json = JSON.stringify(schema, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

function replaceBetween(html, start, end, content) {
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from === -1 || to === -1 || to < from) {
    throw new Error(`markers ${start} / ${end} not found in menu.html`);
  }
  return html.slice(0, from + start.length) + '\n' + content + '\n' + html.slice(to);
}

async function main() {
  let products;
  try {
    products = await fetchProducts();
  } catch (err) {
    console.warn(`[menu-snapshot] could not load the menu (${err.message}); keeping the committed snapshot.`);
    return;
  }

  const categories = groupByCategory(products);
  if (categories.length === 0) {
    console.warn('[menu-snapshot] menu came back empty; keeping the committed snapshot.');
    return;
  }

  let html = await readFile(MENU_FILE, 'utf8');
  html = replaceBetween(html, SNAPSHOT_START, SNAPSHOT_END, renderSnapshot(categories));
  html = replaceBetween(html, SCHEMA_START, SCHEMA_END, renderSchema(categories));
  await writeFile(MENU_FILE, html);

  const itemCount = categories.reduce((n, c) => n + c.items.length, 0);
  console.log(`[menu-snapshot] wrote ${itemCount} items in ${categories.length} categories to menu.html`);
}

main().catch((err) => {
  // Never fail the deploy over the snapshot.
  console.warn(`[menu-snapshot] skipped: ${err.message}`);
});
