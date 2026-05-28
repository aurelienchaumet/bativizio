// shared.js — Client Supabase et fonctions UI partagées entre les pages

const { createClient } = supabase;
const sb = createClient(
  'https://cajgqzzyxykzxsudpmms.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhamdxenp5eHlrenhzdWRwbW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjU3NzEsImV4cCI6MjA5MTQwMTc3MX0.3kuRoLsmdDU8Hd-U4b7S8q1GSZwsf46SN7JOEFMKrz0'
);

// ── Grille vidéos (Bunny Stream) ──
// Bunny fournit deux types d'URL :
//   - iframe embed : https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID
//   - HLS direct   : https://VIDEO_ID.mediadelivery.net/VIDEO_ID/playlist.m3u8
// Pour les vidéos drone on utilise l'iframe Bunny directement.
// Pour les vidéos 360° on utilise l'iframe Bunny (le player videojs-vr
// est disponible dans client/index.html via les balises <script> ajoutées).

function getEmbedUrl(m) {
  if (m.url_media) return m.url_media;
  if (m.url_youtube) return `https://player.vimeo.com/video/${m.url_youtube}`;
  return null;
}

function buildMediaGrid(medias) {
  if (!medias.length) return '';
  const videos360  = medias.filter(m => m.type === '360');
  const videosDrone = medias.filter(m => m.type === 'drone');
  let html = '';

  // ── Section 360° ──
  if (videos360.length) {
    html += `<div class="media-section-label">⦿ Visite 360°</div>`;
    videos360.forEach((m, i) => {
      const embedUrl = getEmbedUrl(m);
      if (!embedUrl) return;
      const videoId = `vjs360-${i}-${Date.now()}`;
      const isBunnyEmbed = embedUrl.includes('iframe.mediadelivery.net');
      const isVimeo = embedUrl.includes('vimeo.com');
      if (isBunnyEmbed || isVimeo) {
        html += `
          <div class="media-card solo" style="cursor:default;">
            <iframe src="${embedUrl}"
              style="width:100%;height:100%;border:none;display:block;"
              allow="autoplay;fullscreen;picture-in-picture" allowfullscreen
              title="${(m.nom||'Visite 360°').replace(/"/g,'&quot;')}">
            </iframe>
          </div>`;
      } else {
        // URL directe MP4/HLS — player videojs-vr sphérique
        html += `
          <div class="media-card solo" style="cursor:default;overflow:visible;">
            <video id="${videoId}" class="video-js vjs-default-skin vjs-big-play-centered"
              controls preload="auto" crossorigin="anonymous" playsinline
              style="width:100%;height:100%;">
              <source src="${embedUrl}" type="${embedUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'}">
            </video>
          </div>`;
        setTimeout(() => {
          if (typeof videojs !== 'undefined' && document.getElementById(videoId)) {
            const p = videojs(videoId, { fluid: false, responsive: true });
            if (typeof p.vr === 'function') p.vr({ projection: 'equirectangular' });
          }
        }, 200);
      }
    });
  }

  // ── Section vidéo drone ──
  if (videosDrone.length) {
    html += `<div class="media-section-label" style="margin-top:${videos360.length?'20px':'0'}">🎬 Vidéo drone</div>`;
    const [first, ...rest] = videosDrone;
    const firstUrl = getEmbedUrl(first);
    const featClass = rest.length === 0 ? 'solo' : 'featured';
    if (firstUrl) {
      html += `
        <div class="media-card ${featClass}" style="cursor:default;">
          <iframe src="${firstUrl}"
            style="width:100%;height:100%;border:none;display:block;"
            allow="autoplay;fullscreen;picture-in-picture" allowfullscreen
            title="${(first.nom||'Vidéo drone').replace(/"/g,'&quot;')}">
          </iframe>
        </div>`;
    }
    if (rest.length) {
      html += `<div class="media-grid" style="margin-top:10px">`;
      rest.forEach(m => {
        const url = getEmbedUrl(m);
        if (!url) return;
        const nom = (m.nom||'').replace(/'/g,"\\'");
        html += `
          <div class="media-card" onclick="openBunny('${url}','${nom}')">
            <div class="thumb-drone"></div>
            <div class="media-overlay">
              <div class="media-info">
                <div class="media-type">Vue drone</div>
                <div class="media-name">${m.nom||''}</div>
              </div>
            </div>
            <div class="play-btn">▶</div>
          </div>`;
      });
      html += `</div>`;
    }
  }

  return html ? `<div class="media-grid">${html}</div>` : '';
}

// ── Grille photos ──
function buildPhotoGrid(photos, panelIndex) {
  if (!photos.length) return '';
  const thumbs = photos.map((p, i) => `
    <div class="photo-thumb" onclick="openPhotoLightbox(${panelIndex},${i})">
      <img src="${p.url_media}" alt="${(p.nom||'Photo '+(i+1)).replace(/"/g,'&quot;')}" loading="lazy">
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

// ── Lightbox Bunny ──
function openBunny(url, title) {
  document.getElementById('lightbox-iframe').src = url;
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
  lbPhotos = imgs.map(img => ({ url_media: img.src, nom: img.alt }));
  lbIndex  = index;
  updatePhotoLightbox();
  document.getElementById('photo-lightbox').classList.add('open');
  document.querySelectorAll('.photo-lb-nav').forEach(n => n.style.display = lbPhotos.length > 1 ? 'flex' : 'none');
}

function updatePhotoLightbox() {
  const p = lbPhotos[lbIndex];
  document.getElementById('photo-lb-img').src = p.url_media;
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
