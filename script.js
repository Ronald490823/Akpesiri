// Live Lagos clock
const clock = document.getElementById('clock');
const tick = () => {
  clock.textContent = new Date().toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos'
  }).replace(',', '') + ' · Lagos';
};
tick();
setInterval(tick, 10000);

document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu
const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  })
);

// ===== Music: "Happy" by Pharrell Williams (official 30s Apple Music preview) =====
const song = document.getElementById('song');
const playBtn = document.getElementById('playBtn');
const music = document.querySelector('.music');
const bar = document.getElementById('progressBar');
const cur = document.getElementById('curTime');
const dur = document.getElementById('durTime');
const toast = document.getElementById('soundToast');
const art = document.querySelector('.music-art');
const TARGET_VOL = 0.45;
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
let userPaused = false;

// Refresh the preview URL + cover art from iTunes (preview links can change over time)
fetch('https://itunes.apple.com/search?term=pharrell+williams+happy&entity=song&limit=5')
  .then(r => r.json())
  .then(d => {
    const hit = d.results.find(r => /^Happy/.test(r.trackName) && r.artistName === 'Pharrell Williams' && !/Live/i.test(r.trackName));
    if (!hit) return;
    if (song.paused && hit.previewUrl && hit.previewUrl !== song.src) song.src = hit.previewUrl;
    if (hit.artworkUrl100) {
      art.innerHTML = `<img src="${hit.artworkUrl100.replace('100x100', '200x200')}" alt="">`;
    }
  })
  .catch(() => {});

function fadeTo(vol, ms = 1200, done) {
  const start = song.volume, t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / ms);
    song.volume = start + (vol - start) * k;
    k < 1 ? requestAnimationFrame(step) : done && done();
  };
  requestAnimationFrame(step);
}

function setUI(playing) {
  music.classList.toggle('playing', playing);
  playBtn.textContent = playing ? '⏸' : '▶';
  playBtn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
}

async function startMusic() {
  try {
    song.volume = 0;
    await song.play();
    fadeTo(TARGET_VOL);
    hideToast();
    return true;
  } catch { return false; }
}
function stopMusic() { fadeTo(0, 400, () => song.pause()); }

song.addEventListener('play', () => setUI(true));
song.addEventListener('pause', () => setUI(false));
song.addEventListener('loadedmetadata', () => { if (isFinite(song.duration)) dur.textContent = fmt(song.duration); });
song.addEventListener('timeupdate', () => {
  if (!song.duration) return;
  bar.style.width = (song.currentTime / song.duration) * 100 + '%';
  cur.textContent = fmt(song.currentTime);
});

playBtn.addEventListener('click', e => {
  e.stopPropagation();
  if (song.paused) { userPaused = false; startMusic(); }
  else { userPaused = true; stopMusic(); }
});
document.getElementById('backBtn').addEventListener('click', e => {
  e.stopPropagation(); song.currentTime = 0;
  if (song.paused) { userPaused = false; startMusic(); }
});
const muteBtn = document.getElementById('muteBtn');
muteBtn.addEventListener('click', e => {
  e.stopPropagation();
  song.muted = !song.muted;
  muteBtn.textContent = song.muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-label', song.muted ? 'Unmute' : 'Mute');
});
document.getElementById('progress').addEventListener('click', e => {
  if (!song.duration) return;
  const r = e.currentTarget.getBoundingClientRect();
  song.currentTime = ((e.clientX - r.left) / r.width) * song.duration;
});

// Autoplay: try right away; browsers usually block sound until the first interaction,
// so we start on the first tap / click / key press instead.
function showToast() { toast.hidden = false; requestAnimationFrame(() => toast.classList.add('show')); }
function hideToast() { toast.classList.remove('show'); setTimeout(() => (toast.hidden = true), 400); }
const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
function unlock(e) {
  if (e.target.closest && e.target.closest('.controls')) return;   // player buttons handle themselves
  unlockEvents.forEach(ev => document.removeEventListener(ev, unlock, true));
  if (!userPaused && song.paused) startMusic();
}
startMusic().then(ok => {
  if (ok) return;
  unlockEvents.forEach(ev => document.addEventListener(ev, unlock, true));
  setTimeout(() => { if (song.paused && !userPaused) showToast(); }, 1200);
});
toast.addEventListener('click', () => { hideToast(); });

// Be polite: pause when the tab is hidden, resume when back
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !song.paused) { song.pause(); song.dataset.resume = '1'; }
  else if (!document.hidden && song.dataset.resume) { delete song.dataset.resume; startMusic(); }
});

// Live Lagos weather (Open-Meteo, no API key). Falls back to the static values in the HTML.
(async () => {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=6.52&longitude=3.38' +
      '&current=temperature_2m&daily=weather_code,temperature_2m_max&timezone=Africa%2FLagos&forecast_days=7';
    const res = await fetch(url);
    if (!res.ok) return;
    const d = await res.json();
    const icon = c => c === 0 ? '☀️' : c <= 3 ? '⛅' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 82 ? '🌦️' : '⛈️';
    document.getElementById('wTemp').textContent = Math.round(d.current.temperature_2m) + '°';
    document.getElementById('forecast').innerHTML = d.daily.time.map((day, i) => {
      const name = new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
      return `<li><span>${name}</span>${icon(d.daily.weather_code[i])}<b>${Math.round(d.daily.temperature_2m_max[i])}°</b></li>`;
    }).join('');
  } catch (_) { /* keep fallback */ }
})();

// Search: filters experience + projects
const search = document.getElementById('search');
const items = [...document.querySelectorAll('.searchable')];
const empty = document.getElementById('searchEmpty');
search.addEventListener('input', () => {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  items.forEach(el => {
    const hay = (el.textContent + ' ' + (el.dataset.tags || '')).toLowerCase();
    const match = !q || q.split(/\s+/).every(w => hay.includes(w));
    el.classList.toggle('hidden-by-search', !match);
    if (match) shown++;
  });
  empty.hidden = shown > 0;
});
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== search) {
    e.preventDefault();
    search.focus();
    search.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
});

// Seamless marquee
const track = document.getElementById('marquee');
track.innerHTML += track.innerHTML;

// Scroll reveal: gentle on normal scrolling, instant when scrolling fast,
// and anything you've already scrolled past is shown immediately (no catching up later).
const pending = new Set();
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); io.unobserve(e.target); pending.delete(e.target); }
  });
}, { threshold: 0, rootMargin: '0px 0px 12% 0px' });
document.querySelectorAll('.card:not(.hero .card), .pillar, .section-title, .window, .role-item, .g-item')
  .forEach(el => { el.classList.add('reveal'); pending.add(el); io.observe(el); });
function flushPassed() {
  const limit = window.innerHeight * 1.1;
  pending.forEach(el => {
    if (el.getBoundingClientRect().top < limit) { el.classList.add('in'); io.unobserve(el); pending.delete(el); }
  });
}

// ===== Desktop hero: show the top nav only after leaving the hero =====
const topbar = document.getElementById('top');
const afterHero = document.querySelector('.after-hero');
// The hero is sticky, so it never "leaves" the viewport. Watch the content sliding over it instead.
let navTicking = false;
const deskEl = document.getElementById('home');
const root = document.documentElement;
let lastY = window.scrollY, lastT = performance.now(), fastTimer = null;
function updateNav() {
  navTicking = false;
  const top = afterHero.getBoundingClientRect().top;
  topbar.dataset.hidden = top < window.innerHeight * 0.35 ? 'false' : 'true';
  // Once the content fully covers the sticky hero, stop painting it (its blur layers are expensive)
  deskEl.classList.toggle('is-covered', top <= 0);

  // Fast scroll: skip reveal animations so nothing lags behind or "scatters"
  const now = performance.now(), y = window.scrollY;
  const speed = Math.abs(y - lastY) / Math.max(1, now - lastT);   // px per ms
  lastY = y; lastT = now;
  if (speed > 1.2) {
    root.classList.add('fast-scroll');
    clearTimeout(fastTimer);
    fastTimer = setTimeout(() => root.classList.remove('fast-scroll'), 250);
  }
  if (pending.size) flushPassed();
}
window.addEventListener('scroll', () => {
  if (!navTicking) { navTicking = true; requestAnimationFrame(updateNav); }
}, { passive: true });
window.addEventListener('resize', updateNav);
updateNav();

// ===== Draggable desktop widgets (desktop widths only) =====
const screenEl = document.getElementById('desk');
const canDrag = () => window.matchMedia('(min-width: 861px)').matches;
let topZ = 5;
screenEl.querySelectorAll('.dw').forEach(el => {
  let sx, sy, ox, oy, moved = false, active = false;
  el.addEventListener('pointerdown', e => {
    if (!canDrag() || e.button !== 0 || e.pointerType === 'touch') return;
    if (e.target.closest('button, .progress')) return;          // keep player controls clickable
    active = true; moved = false;
    sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop;
    el.style.zIndex = ++topZ;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e => {
    if (!active) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true; el.classList.add('dragging');
    const maxX = screenEl.clientWidth - el.offsetWidth, maxY = screenEl.clientHeight - el.offsetHeight;
    el.style.left = Math.max(0, Math.min(maxX, ox + dx)) + 'px';
    el.style.top = Math.max(28, Math.min(maxY, oy + dy)) + 'px';
  });
  const end = () => { active = false; el.classList.remove('dragging'); };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  // a drag should not count as a click on the link inside
  el.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
});

// ===== Gallery lightbox =====
const lb = document.getElementById('lightbox');
if (lb && lb.showModal) {
  const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.lb-cap');
  document.querySelectorAll('.g-open').forEach(btn => btn.addEventListener('click', () => {
    const img = btn.querySelector('img');
    lbImg.src = img.src; lbImg.alt = img.alt;
    lbCap.textContent = btn.parentElement.querySelector('figcaption').innerText.replace('\n', ' · ');
    lb.showModal();
  }));
  lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
}
