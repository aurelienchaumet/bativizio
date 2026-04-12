const { createClient } = supabase;
const sb = createClient(
  'https://cajgqzzyxykzxsudpmms.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhamdxenp5eHlrenhzdWRwbW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjU3NzEsImV4cCI6MjA5MTQwMTc3MX0.3kuRoLsmdDU8Hd-U4b7S8q1GSZwsf46SN7JOEFMKrz0'
);

window.addEventListener('DOMContentLoaded', async () => {
  const el = document.getElementById('demo-email-display');
  if (el) el.textContent = 'demo' + '@' + 'bativizio.io';
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role === 'admin') { window.location.href = '/admin'; return; }
    if (profile?.role === 'constructeur') { window.location.href = '/constructeur'; return; }
    if (profile?.role === 'client') { await loadApp(session.user); }
  }
});

async function doLogin() {
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const btn   = document.getElementById('btn-login');
  if (!email || !pass) { errEl.textContent = 'Merci de remplir tous les champs.'; errEl.style.display = 'block'; return; }
  btn.textContent = 'Connexion...'; btn.disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    errEl.textContent = 'Email ou mot de passe incorrect.';
    errEl.style.display = 'block';
    btn.textContent = 'Acceder a mon suivi'; btn.disabled = false;
    return;
  }
  const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
  if (profile?.role === 'admin') { window.location.href = '/admin'; return; }
  if (profile?.role === 'constructeur') { window.location.href = '/constructeur'; return; }
  if (profile?.role === 'client') { await loadApp(data.user); return; }
  await sb.auth.signOut();
  errEl.textContent = 'Aucun acces configure pour ce compte.';
  errEl.style.display = 'block';
  btn.textContent = 'Acceder a mon suivi'; btn.disabled = false;
}

function fillDemo() {
  document.getElementById('login-email').value = 'demo' + '@' + 'bativizio.io';
  document.getElementById('login-pass').value  = 'demo';
  doLogin();
}

async function loadApp(user) {
  document.getElementById('login-screen').classList.add('hidden');
  setTimeout(() => document.getElementById('app').classList.add('visible'), 800);
  const { data: profile } = await sb.from('profiles').select('nom').eq('id', user.id).single();
  document.getElementById('client-name').textContent = profile?.nom || user.email;
  const { data: chantier } = await sb.from('chantiers').select('*, constructeur_profile:profiles!chantiers_constructeur_id_fkey(nom)').eq('client_id', user.id).single();
  if (!chantier) {
    document.getElementById('hero-address').innerHTML = '<em style="opacity:0.6">Aucun chantier associe.</em>';
    document.getElementById('panels-container').innerHTML = '<div class="empty-state"><div class="empty-icon">X</div><p>Votre chantier apparaitra ici.</p></div>';
    return;
  }
  document.getElementById('hero-address').innerHTML = chantier.adresse + '<br>' + chantier.code_postal + ' ' + chantier.ville;
  const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR', {month:'long', year:'numeric'}) : '-';
  document.getElementById('hero-meta').innerHTML =
    '<div class="meta-item"><span class="meta-label">Debut</span><span class="meta-value">' + fmt(chantier.date_debut) + '</span></div>' +
    '<div class="meta-item"><span class="meta-label">Livraison</span><span class="meta-value">' + fmt(chantier.date_livraison) + '</span></div>' +
    '<div class="meta-item"><span class="meta-label">Constructeur</span><span class="meta-value">' + (chantier.constructeur_profile?.nom || '-') + '</span></div>' +
    '<div class="meta-item"><span class="meta-label">Passages</span><span class="meta-value" id="nb-passages">-</span></div>';
  const pct = chantier.avancement || 0;
  document.getElementById('progress-pct').textContent = pct + '%';
  setTimeout(() => { document.getElementById('progress-fill').style.width = pct + '%'; }, 400);
  await loadPassages(chantier.id);
}

async function loadPassages(chantierId) {
  const { data: passages } = await sb.from('passages').select('*, medias(*)').eq('chantier_id', chantierId).order('date_passage', { ascending: false });
  const nbEl = document.getElementById('nb-passages');
  if (nbEl) nbEl.textContent = passages?.length || 0;
  const tabsEl   = document.getElementById('timeline-tabs');
  const panelsEl = document.getElementById('panels-container');
  if (!passages || passages.length === 0) {
    tabsEl.innerHTML = '';
    panelsEl.innerHTML = '<div class="empty-state"><p>Aucun passage enregistre.</p></div>';
    return;
  }
  tabsEl.innerHTML = passages.map((p, i) => {
    const d = new Date(p.date_passage);
    const mois = d.toLocaleDateString('fr-FR', {month:'long'});
    const an = d.getFullYear();
    return '<button class="tab-btn ' + (i===0?'active':'') + '" onclick="switchTab(' + i + ')" role="tab">' +
      '<div class="tab-dot"></div>' +
      '<span class="tab-month">' + mois[0].toUpperCase() + mois.slice(1) + '</span>' +
      '<span class="tab-year">' + an + '</span></button>';
  }).join('');
  panelsEl.innerHTML = passages.map((p, i) => buildPanel(p, i)).join('');
}

function buildPanel(p, i) {
  const date = new Date(p.date_passage).toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
  const badge = i === 0
    ? '<span class="passage-badge latest">Dernier passage</span>'
    : '<span class="passage-badge">Archive</span>';
  const note = p.note
    ? '<div class="notes-card"><div class="notes-title">Note du passage</div><div class="notes-text">' + p.note + '</div></div>'
    : '';
  const videos = (p.medias||[]).filter(m => m.type !== 'photo');
  const photos = (p.medias||[]).filter(m => m.type === 'photo');
  return '<div class="content-panel ' + (i===0?'active':'') + '" id="panel-' + i + '">' +
    '<div class="passage-header"><div>' +
    '<div class="passage-title">' + p.titre + '</div>' +
    '<div class="passage-subtitle">Realise le ' + date + '</div>' +
    '</div>' + badge + '</div>' +
    buildMediaGrid(videos) + buildPhotoGrid(photos, i) + note + '</div>';
}

function buildMediaGrid(medias) {
  if (!medias.length) return '';
  const [first, ...rest] = medias;
  const featClass = rest.length === 0 ? 'solo' : 'featured';
  const firstCard = '<div class="media-card ' + featClass + '" style="cursor:default;">' +
    '<iframe src="https://player.vimeo.com/video/' + first.url_youtube +
    '?autoplay=0&loop=0&color=4A8FAD&title=0&byline=0&portrait=0" ' +
    'style="width:100%;height:100%;border:none;display:block;" ' +
    'allow="autoplay; fullscreen; picture-in-picture; xr-spatial-tracking" allowfullscreen></iframe></div>';
  const restCards = rest.map(m => {
    const cl = m.type === '360' ? 'thumb-360' : 'thumb-drone';
    const lbl = m.type === '360' ? 'Video 360' : 'Vue drone';
    const n = (m.nom||'').replace(/'/g,"\\'");
    return '<div class="media-card" onclick="openVimeo(\'' + m.url_youtube + '\',\'' + n + '\')">' +
      '<div class="' + cl + '"></div>' +
      '<div class="media-overlay"><div class="media-info">' +
      '<div class="media-type">' + lbl + '</div>' +
      '<div class="media-name">' + (m.nom||'') + '</div></div></div>' +
      '<div class="play-btn">&#9658;</div></div>';
  }).join('');
  return '<div class="media-grid">' + firstCard + restCards + '</div>';
}

function buildPhotoGrid(photos, panelIndex) {
  if (!photos.length) return '';
  const thumbs = photos.map((p, i) =>
    '<div class="photo-thumb" onclick="openPhotoLightbox(' + panelIndex + ',' + i + ')">' +
    '<img src="' + p.url_photo + '" alt="' + (p.nom||('Photo '+(i+1))).replace(/"/g,'&quot;') + '" loading="lazy">' +
    '<div class="photo-overlay"><span class="photo-zoom-icon">+</span></div></div>'
  ).join('');
  return '<div class="photo-section"><div class="photo-section-title">Photos du passage</div>' +
    '<div class="photo-grid">' + thumbs + '</div></div>';
}

let lbPhotos = [], lbIndex = 0;

function openPhotoLightbox(panelIndex, index) {
  const panel = document.getElementById('panel-' + panelIndex);
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
  const cap = document.getElementById('photo-lb-caption');
  if (cap) cap.textContent = p.nom || '';
  const ctr = document.getElementById('photo-lb-counter');
  if (ctr) ctr.textContent = (lbIndex+1) + ' / ' + lbPhotos.length;
}

function lbNavPhoto(dir) {
  lbIndex = (lbIndex + dir + lbPhotos.length) % lbPhotos.length;
  updatePhotoLightbox();
}

function closePhotoLightbox() { document.getElementById('photo-lightbox').classList.remove('open'); }

function switchTab(i) {
  document.querySelectorAll('.tab-btn').forEach((b,j) => b.classList.toggle('active', i===j));
  document.querySelectorAll('.content-panel').forEach((p,j) => p.classList.toggle('active', i===j));
}

function openVimeo(id, title) {
  document.getElementById('lightbox-iframe').src =
    'https://player.vimeo.com/video/' + id + '?autoplay=1&color=4A8FAD&title=0&byline=0&portrait=0';
  document.getElementById('lightbox-title').textContent = title || '';
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightbox-iframe').src = '';
}

async function doLogout() {
  await sb.auth.signOut();
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('login-screen').classList.contains('hidden')) doLogin();
  if (e.key === 'Escape') { closeLightbox(); closePhotoLightbox(); }
  if (e.key === 'ArrowLeft'  && document.getElementById('photo-lightbox').classList.contains('open')) lbNavPhoto(-1);
  if (e.key === 'ArrowRight' && document.getElementById('photo-lightbox').classList.contains('open')) lbNavPhoto(1);
});
