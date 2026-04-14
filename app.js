// app.js — Authentification et logique espace client
// Dépend de shared.js (sb, fonctions UI)

window.addEventListener('DOMContentLoaded', async () => {
  const el = document.getElementById('demo-email-display');
  if (el) el.textContent = 'demo' + '@' + 'bativizio.io';
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role === 'admin') { hideLoginScreen(); window.location.href = '/admin'; return; }
    if (profile?.role === 'constructeur') { hideLoginScreen(); window.location.href = '/constructeur'; return; }
    if (profile?.role === 'client') {
      if (window.location.pathname.startsWith('/client')) {
        await loadApp(session.user);
      } else {
        window.location.href = '/client/';
      }
      return;
    }
  }
});

function hideLoginScreen() {
  const ls = document.getElementById('login-screen');
  if (ls) ls.classList.add('hidden');
}

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
    btn.textContent = 'Accéder à mon espace →'; btn.disabled = false;
    return;
  }
  const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
  if (profile?.role === 'admin') { hideLoginScreen(); window.location.href = '/admin'; return; }
  if (profile?.role === 'constructeur') { hideLoginScreen(); window.location.href = '/constructeur'; return; }
  if (profile?.role === 'client') {
    if (window.location.pathname.startsWith('/client')) {
      await loadApp(data.user); return;
    } else {
      window.location.href = '/client/'; return;
    }
  }
  await sb.auth.signOut();
  errEl.textContent = 'Aucun accès configuré pour ce compte.';
  errEl.style.display = 'block';
  btn.textContent = 'Accéder à mon espace →'; btn.disabled = false;
}

function fillDemo(type) {
  if (type === 'constructeur') {
    document.getElementById('login-email').value = 'constructeur' + '@' + 'bativizio.io';
    document.getElementById('login-pass').value  = 'constructeur';
  } else {
    document.getElementById('login-email').value = 'demo' + '@' + 'bativizio.io';
    document.getElementById('login-pass').value  = 'demo';
  }
  doLogin();
}

async function loadApp(user) {
  document.getElementById('login-screen').classList.add('hidden');
  setTimeout(() => document.getElementById('app').classList.add('visible'), 800);
  const { data: profile } = await sb.from('profiles').select('nom').eq('id', user.id).single();
  document.getElementById('client-name').textContent = profile?.nom || user.email;
  const { data: chantier } = await sb.from('chantiers').select('*, constructeur_profile:profiles!chantiers_constructeur_id_fkey(nom, logo_url)').eq('client_id', user.id).single();
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
    '<div class="meta-item constructeur-meta">' +(chantier.constructeur_profile?.logo_url ? '<img src="' + chantier.constructeur_profile.logo_url + '" alt="Logo constructeur" class="constructeur-logo">' : '') +'<div><span class="meta-label">Constructeur</span><span class="meta-value">' + (chantier.constructeur_profile?.nom || '-') + '</span></div></div>' +
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

async function doLogout() {
  await sb.auth.signOut();
  window.location.href = '/';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('login-screen').classList.contains('hidden')) doLogin();
  if (e.key === 'Escape') { closeLightbox(); closePhotoLightbox(); }
  if (e.key === 'ArrowLeft'  && document.getElementById('photo-lightbox').classList.contains('open')) lbNavPhoto(-1);
  if (e.key === 'ArrowRight' && document.getElementById('photo-lightbox').classList.contains('open')) lbNavPhoto(1);
});
