// shared.js — Client Supabase et fonctions UI partagées entre les pages

const { createClient } = supabase;
const sb = createClient(
  'https://cajgqzzyxykzxsudpmms.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhamdxenp5eHlrenhzdWRwbW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjU3NzEsImV4cCI6MjA5MTQwMTc3MX0.3kuRoLsmdDU8Hd-U4b7S8q1GSZwsf46SN7JOEFMKrz0'
);

// ── Grille vidéos ──
function buildMediaGrid(medias) {
  if (!medias.length) return '';
  const [first, ...rest] = medias;
  const featClass = rest.length === 0 ? 'solo' : 'featured';
  const firstCard = `
    <div class="media-card ${featClass}" style="cursor:default;">
      <iframe src="https://player.vimeo.com/video/${first.url_youtube}?autoplay=0&loop=0&color=4A8FAD&title=0&byline=0&portrait=0"
        style="width:100%;height:100%;border:none;display:block;"
        allow="autoplay;fullscreen;picture-in-picture;xr-spatial-tracking" allowfullscreen
        title="${(first.nom||'').replace(/"/g,'&quot;')}">
      </iframe>
    </div>`;
  const restCards = rest.map(m => {
    const thumbClass = m.type === '360' ? 'thumb-360' : 'thumb-drone';
    const typeLabel  = m.type === '360' ? 'Vidéo 360°' : 'Vue drone';
    const nom = (m.nom||'').replace(/'/g,"\\'");
    return `
      <div class="media-card" onclick="openVimeo('${m.url_youtube}','${nom}')">
        <div class="${thumbClass}"></div>
        <div class="media-overlay">
          <div class="media-info">
            <div class="media-type">${typeLabel}</div>
            <div class="media-name">${m.nom||''}</div>
          </div>
        </div>
        <div class="play-btn">▶</div>
      </div>`;
  }).join('');
  return `<div class="media-grid">${firstCard}${restCards}</div>`;
}

// ── Grille photos ──
function buildPhotoGrid(photos, panelIndex) {
  if (!photos.length) return '';
  const thumbs = photos.map((p, i) => `
    <div class="photo-thumb" onclick="openPhotoLightbox(${panelIndex},${i})">
      <img src="${p.url_photo}" alt="${(p.nom||'Photo '+(i+1)).replace(/"/g,'&quot;')}" loading="lazy">
      <div class="photo-overlay"><span class="photo-zoom-icon">+</span></div>
    </div>`
  ).join('');
  return `
    <div class="photo-section">
      <div class="photo-section-title">Photos du passage</div>
      <div class="photo-grid">${thumbs}</div>
    </div>`;
}

// ── Onglets de navigation ──
function switchTab(i) {
  document.querySelectorAll('.tab-btn').forEach((b,j) => b.classList.toggle('active', i===j));
  document.querySelectorAll('.content-panel').forEach((p,j) => p.classList.toggle('active', i===j));
}

// ── Lightbox Vimeo ──
function openVimeo(id, title) {
  document.getElementById('lightbox-iframe').src =
    `https://player.vimeo.com/video/${id}?autoplay=1&color=4A8FAD&title=0&byline=0&portrait=0`;
  document.getElementById('lightbox-title').textContent = title || '';
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightbox-iframe').src = '';
}

// ── Lightbox photo ──
let lbPhotos = [], lbIndex = 0;

function openPhotoLightbox(panelIndex, index) {
  const panel = document.getElementById(`panel-${panelIndex}`);
  const imgs  = panel ? [...panel.querySelectorAll('.photo-thumb img')] : [];
  lbPhotos = imgs.map(img => ({ url_photo: img.src, nom: img.alt }));
  lbIndex  = index;
  updatePhotoLightbox();
  document.getElementById('photo-lightbox').classList.add('open');
  document.querySelectorAll('.photo-lb-nav').forEach(n => n.style.display = lbPhotos.length > 1 ? 'flex' : 'none');
}

function updatePhotoLightbox() {
  const p = lbPhotos[lbIndex];
  document.getElementById('photo-lb-img').src = p.url_photo;
  document.getElementById('photo-lb-img').alt = p.nom || '';
  const caption = document.getElementById('photo-lb-caption');
  if (caption) caption.textContent = p.nom || '';
  const counter = document.getElementById('photo-lb-counter');
  if (counter) counter.textContent = `${lbIndex+1} / ${lbPhotos.length}`;
}

function lbNavPhoto(dir) {
  lbIndex = (lbIndex + dir + lbPhotos.length) % lbPhotos.length;
  updatePhotoLightbox();
}

function closePhotoLightbox() {
  document.getElementById('photo-lightbox').classList.remove('open');
}
