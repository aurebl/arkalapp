// Génère le site statique dans le dossier `site/`.
// Utilisation : node src/build.mjs   (aucune dépendance à installer)

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL, STORE_LINKS, CONTACT_EMAIL, YEAR, ROUTES, TEXT } from './site.config.mjs';

const SRC = dirname(fileURLToPath(import.meta.url));
const OUT = join(SRC, '..', 'site');
const LANGS = ['en', 'fr'];

// ---------- Utilitaires ----------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function write(path, content) {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

// Une URL `/terms` est servie par le fichier `terms.html`, `/fr/` par `fr/index.html`.
const fileFor = (route) => (route.endsWith('/') ? `${route}index.html` : `${route}.html`).slice(1);

// Empreinte des fichiers CSS/JS pour forcer le rechargement après une mise à jour.
const assetVersion = {};
for (const name of readdirSync(join(SRC, 'assets'))) {
  assetVersion[name] = createHash('sha1').update(readFileSync(join(SRC, 'assets', name))).digest('hex').slice(0, 8);
}
const asset = (name) => `/assets/${name}?v=${assetVersion[name]}`;

// Image de partage d'une langue, avec empreinte : les réseaux sociaux rechargent l'aperçu quand elle change.
const shareImage = (lang) => {
  const name = `og-image-${lang}.jpg`;
  const v = createHash('sha1').update(readFileSync(join(SRC, 'public', name))).digest('hex').slice(0, 8);
  return `${SITE_URL}/${name}?v=${v}`;
};

// ---------- Markdown (sous-ensemble utilisé par les pages légales) ----------

const MONTHS_FR = { January: 'janvier', February: 'février', March: 'mars', April: 'avril', May: 'mai', June: 'juin', July: 'juillet', August: 'août', September: 'septembre', October: 'octobre', November: 'novembre', December: 'décembre' };

function inline(text, lang) {
  let s = esc(text);
  s = s.replace(
    /(https?:\/\/[^\s<]*[^\s<.,;:)])|(www\.[^\s<]*[^\s<.,;:)])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g,
    (m, url, www, email) => {
      if (url) return `<a href="${url}">${url}</a>`;
      if (www) return `<a href="https://${www}">${www}</a>`;
      return `<a href="mailto:${email}">${email}</a>`;
    },
  );
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Typographie française : espaces insécables avant : ; ! ? » et après «
  if (lang === 'fr') s = s.replace(/ ([:;!?»])/g, '&nbsp;$1').replace(/« /g, '«&nbsp;');
  return s;
}

function markdown(src, lang) {
  const lines = src.split('\n');
  const out = [];
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${para.map((l) => inline(l, lang)).join('<br>\n')}</p>`);
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '---') { flush(); continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2], lang)}</h${h[1].length}>`); continue; }
    if (line.startsWith('- ')) {
      flush();
      const items = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) items.push(lines[i++].trim().slice(2));
      i--;
      out.push(`<ul>\n${items.map((it) => `<li>${inline(it, lang)}</li>`).join('\n')}\n</ul>`);
      continue;
    }
    if (line.startsWith('|')) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim());
      i--;
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(
        '<div class="table-wrap"><table>\n' +
          `<thead><tr>${cells(head).map((c) => `<th>${inline(c, lang)}</th>`).join('')}</tr></thead>\n` +
          `<tbody>\n${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c, lang)}</td>`).join('')}</tr>`).join('\n')}\n</tbody>\n` +
          '</table></div>',
      );
      continue;
    }
    para.push(line);
  }
  flush();
  return out.join('\n');
}

// Sépare un fichier légal en { date, en, fr } : la partie « ## English » et la partie « ## Français ».
function splitLegal(file) {
  const src = readFileSync(join(SRC, 'content', file), 'utf8');
  const date = src.match(/\*\*Effective date:\s*(.+?)\*\*/)[1].trim();
  const enStart = src.indexOf('## English');
  const frStart = src.indexOf('## Français');
  const strip = (s) => s.replace(/^## .*\n/, '').trim();
  const [month, day, year] = date.replace(',', '').split(' ');
  return {
    date: { en: date, fr: `${day === '1' ? '1er' : day} ${MONTHS_FR[month]} ${year}` },
    en: strip(src.slice(enStart, frStart)),
    fr: strip(src.slice(frStart)),
  };
}

// ---------- Gabarits ----------

const LOGO = `<svg class="logo" width="102" height="14" viewBox="0 0 102 14" fill="none" role="img" aria-label="Arkal" xmlns="http://www.w3.org/2000/svg"><path d="M93.0656 14V0H95.1909V13.2113L94.0692 12.0479H102V14H93.0656Z" fill="currentColor"/><path d="M68.6665 14L73.7044 0H76.4005L81.4384 14H79.1753L77.8961 10.3521H72.1891L70.9296 14H68.6665ZM72.8582 8.41972H77.2467L75.0426 2.03099L72.8582 8.41972Z" fill="currentColor"/><path d="M47.211 14V0H49.3364V6.68451L55.2205 0H57.7985L52.4457 6.11268L58.1528 14H55.6535L51.0288 7.61127L49.3364 9.50422V14H47.211Z" fill="currentColor"/><path d="M24.2645 14V0H29.8338C30.8309 0 31.6902 0.170892 32.4118 0.512676C33.1334 0.85446 33.691 1.34085 34.0846 1.97183C34.4781 2.60282 34.6749 3.35211 34.6749 4.21972C34.6749 4.8507 34.5306 5.41596 34.242 5.91549C33.9665 6.41502 33.5926 6.81596 33.1203 7.11831C32.6611 7.40751 32.1691 7.57183 31.6443 7.61127L31.5459 7.4338C32.4249 7.4338 33.1072 7.63756 33.5926 8.04507C34.078 8.43944 34.3601 9.06385 34.4388 9.91831L34.8127 14H32.6676L32.3331 10.1944C32.2937 9.62911 32.1035 9.21502 31.7624 8.95211C31.4213 8.67606 30.8637 8.53803 30.0896 8.53803H26.3899V14H24.2645ZM26.3899 6.58592H29.8732C30.6735 6.58592 31.3032 6.38873 31.7624 5.99437C32.2347 5.58685 32.4708 5.01502 32.4708 4.27887C32.4708 3.52958 32.2347 2.95775 31.7624 2.56338C31.2901 2.15587 30.6013 1.95211 29.6961 1.95211H26.3899V6.58592Z" fill="currentColor"/><path d="M0 14L5.03793 0H7.734L12.7719 14H10.5088L9.22964 10.3521H3.52261L2.26313 14H0ZM4.19171 8.41972H8.58022L6.37612 2.03099L4.19171 8.41972Z" fill="currentColor"/></svg>`;

const ICON_APPLE = `<svg class="store-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.54 12.01C16.54 12.09 16.4 14.47 19 15.7C18.51 17.18 16.85 20.47 14.91 20.49C13.79 20.49 13.13 19.77 11.87 19.77C10.61 19.77 9.85001 20.47 8.85001 20.49C6.93001 20.55 5.08999 16.93 4.57999 15.46C4.19999 14.34 4.01001 13.25 4.01001 12.2C4.01001 8.64001 6.37001 6.88001 8.60001 6.85001C9.68001 6.85001 11.05 7.64001 11.64 7.64001C12.21 7.64001 13.75 6.7 15.17 6.81C16.66 6.93 17.8 7.52001 18.55 8.60001C17.21 9.42001 16.55 10.53 16.56 12.01H16.54ZM14.31 5.41C15.41 4.11 15.31 2.92 15.27 2.5C14.3 2.56 13.18 3.15999 12.54 3.89999C11.84 4.69999 11.42 5.68001 11.51 6.79001C12.56 6.87001 13.52 6.33 14.3 5.41H14.31Z"/></svg>`;

const ICON_PLAY = `<svg class="store-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.91 11.9998L4.03003 18.5898V5.4198L10.91 11.9998V11.9998ZM11.99 10.9598L15.32 7.76978L7.22998 3.32977C6.91998 3.12977 6.51999 3.02979 6.10999 3.02979C5.45999 3.02979 4.85997 3.31978 4.46997 3.76978L11.98 10.9598H11.99ZM11.99 13.0398L4.46002 20.2498C4.85002 20.7198 5.43999 21.0298 6.10999 21.0298C6.51999 21.0298 6.86999 20.9298 7.17999 20.7298L15.37 16.2698L11.99 13.0298V13.0398ZM19.86 10.2598L16.7 8.52979L13.07 11.9998L16.75 15.5198L19.9 13.7998C20.56 13.4598 21.02 12.7698 21.02 12.0298C20.97 11.2898 20.51 10.5998 19.85 10.2598H19.86Z"/></svg>`;

function head({ lang, page, title, description, extra = '' }) {
  const t = TEXT[lang];
  const other = lang === 'en' ? 'fr' : 'en';
  const url = SITE_URL + ROUTES[page][lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<script>if(location.protocol==='http:'&&/arkalapp\.com$/.test(location.hostname))location.replace('https://arkalapp.com'+location.pathname+location.search+location.hash)</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${SITE_URL + ROUTES[page].en}">
<link rel="alternate" hreflang="fr" href="${SITE_URL + ROUTES[page].fr}">
<link rel="alternate" hreflang="x-default" href="${SITE_URL + ROUTES[page].en}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Arkal">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${shareImage(lang)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="2000">
<meta property="og:image:height" content="1050">
<meta property="og:image:alt" content="${esc(`Arkal — ${t.home.h1}`)}">
<meta property="og:locale" content="${t.locale}">
<meta property="og:locale:alternate" content="${TEXT[other].locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${shareImage(lang)}">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/favicon.png" type="image/png" sizes="48x48">
<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${asset('site.css')}">
${extra}</head>`;
}

function footer(lang, page) {
  const t = TEXT[lang];
  const other = lang === 'en' ? 'fr' : 'en';
  return `<footer class="footer${page === 'home' ? ' reveal' : ''}">
  <nav class="footer-links" aria-label="${lang === 'en' ? 'Footer' : 'Pied de page'}">
    <a href="mailto:${CONTACT_EMAIL}">${t.footer.contact}</a>
    <a href="${ROUTES.terms[lang]}"${page === 'terms' ? ' aria-current="page"' : ''}>${t.footer.terms}</a>
    <a href="${ROUTES.privacy[lang]}"${page === 'privacy' ? ' aria-current="page"' : ''}>${t.footer.privacy}</a>
  </nav>
  <p class="footer-meta">© ${YEAR} Arkal • <a class="lang-switch" href="${ROUTES[page][other]}" hreflang="${other}" lang="${other}">${t.switchLabel}</a></p>
</footer>`;
}

function storeButton(href, icon, small, big) {
  return `<a class="store" href="${esc(href)}">
        ${icon}
        <span class="store-text"><span class="store-small">${small}</span><span class="store-big">${big}</span></span>
      </a>`;
}

function homePage(lang) {
  const t = TEXT[lang];
  const h = t.home;
  return `${head({
    lang,
    page: 'home',
    title: h.title,
    description: h.description,
    extra: `<script>(function(d){d.classList.add('js');if(window.chrome&&CSS.supports('backdrop-filter','blur(1px)'))d.classList.add('refract');setTimeout(function(){d.classList.add('is-ready')},4000)})(document.documentElement)</script>
<link rel="preload" href="${asset('home.js')}" as="script">
`,
  })}
<body class="home">
<canvas class="orb-canvas" aria-hidden="true"></canvas>
<div class="orb-fallback" aria-hidden="true"></div>
<main class="hero">
  <div class="stage">
    <div class="logo-wrap">${LOGO}</div>
  </div>
  <div class="copy reveal">
    <h1>${h.h1}</h1>
    <p class="lede">${h.lede}</p>
    <div class="stores">
      ${storeButton(STORE_LINKS.appStore, ICON_APPLE, h.downloadOn, h.appStore)}
      ${storeButton(STORE_LINKS.googlePlay, ICON_PLAY, h.downloadOn, h.googlePlay)}
    </div>
  </div>
</main>
${footer(lang, 'home')}
<svg class="glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
  <filter id="glass-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.024" numOctaves="2" seed="4" result="noise"/>
    <feGaussianBlur in="noise" stdDeviation="2.5" result="soft"/>
    <feDisplacementMap in="SourceGraphic" in2="soft" scale="22" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
<script src="${asset('home.js')}" defer></script>
</body>
</html>
`;
}

function legalPage(lang, page, content, date) {
  const t = TEXT[lang];
  return `${head({ lang, page, title: t[page].title, description: t[page].description })}
<body class="legal">
<main class="legal-main">
  <a class="back" href="${ROUTES.home[lang]}">${t.back}</a>
  <h1>${t[page].h1}</h1>
  <p class="effective">${inline(t.effective(date), lang)}</p>
  <div class="prose">
${markdown(content, lang)}
  </div>
</main>
${footer(lang, page)}
</body>
</html>
`;
}

function notFoundPage() {
  const t = TEXT.en;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.notFound.title}</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#000000">
<link rel="icon" href="/favicon.png" type="image/png" sizes="48x48">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${asset('site.css')}">
</head>
<body class="legal not-found">
<main class="legal-main">
  <a class="back" href="/">${t.back}</a>
  <h1>${t.notFound.h1}</h1>
  <p class="effective">${t.notFound.body}</p>
</main>
</body>
</html>
`;
}

// ---------- Génération ----------

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'public'), OUT, { recursive: true });
cpSync(join(SRC, 'assets'), join(OUT, 'assets'), { recursive: true });

const legal = { terms: splitLegal('terms.md'), privacy: splitLegal('privacy-policy.md') };

for (const lang of LANGS) {
  write(fileFor(ROUTES.home[lang]), homePage(lang));
  for (const page of ['terms', 'privacy']) {
    write(fileFor(ROUTES[page][lang]), legalPage(lang, page, legal[page][lang], legal[page].date[lang]));
  }
}
write('404.html', notFoundPage());

const urls = Object.values(ROUTES).flatMap((r) => LANGS.map((l) => ({ r, l })));
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    ({ r, l }) => `  <url>
    <loc>${SITE_URL + r[l]}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL + r.en}"/>
    <xhtml:link rel="alternate" hreflang="fr" href="${SITE_URL + r.fr}"/>
  </url>`,
  )
  .join('\n')}
</urlset>
`,
);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
write('.nojekyll', '');

console.log(`Site généré dans ${OUT}`);
