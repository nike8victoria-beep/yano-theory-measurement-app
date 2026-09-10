import { db } from './db.js';
import { hasSeenOnboarding, renderOnboarding } from './views/onboarding.js';
import { renderSiteList } from './views/siteList.js';
import { renderMeasurementFlow } from './views/measurementFlow.js';
import { renderCompletion } from './views/completion.js';
import { startAutoSync, syncPendingData } from './sync.js';

const appEl = document.getElementById('app');

function showOnboarding() {
  renderOnboarding(appEl, { onFinish: showSiteList });
}

function showSiteList() {
  renderSiteList(appEl, {
    onNewSite: () => startMeasurementFlow(null),
    onMeasureAfter: (site) => startMeasurementFlow(site),
  });
}

function startMeasurementFlow(site) {
  renderMeasurementFlow(appEl, {
    site,
    onCancel: showSiteList,
    onComplete: (draft) => completeMeasurement(draft),
  });
}

async function completeMeasurement(draft) {
  if (draft.isNewSite) {
    await db.addSite({ id: draft.siteId, lat: draft.lat, lng: draft.lng, label: draft.siteLabel });
  }

  const observation = await db.addObservation({
    site_id: draft.siteId,
    phase: draft.phase,
    lat: draft.lat,
    lng: draft.lng,
    gps_accuracy_m: draft.gps_accuracy_m,
    photo_blob: draft.photo_blob,
    texture: draft.texture,
    sunlight: draft.sunlight,
    infiltration_time_sec: draft.infiltration_time_sec,
    flag_review: draft.flag_review,
    synced: false,
  });

  const site = await db.getSite(draft.siteId);
  renderCompletion(appEl, { observation, site, onBack: showSiteList });

  syncPendingData();
}

function renderError(message) {
  appEl.innerHTML = `
    <div class="card">
      <h1>大地の再生 計測アプリ</h1>
      <p>${message}</p>
    </div>
  `;
}

async function init() {
  try {
    await db.openDB();
  } catch (err) {
    console.error(err);
    renderError('データベースの初期化に失敗しました。コンソールを確認してください。');
    return;
  }

  if (hasSeenOnboarding()) {
    showSiteList();
  } else {
    showOnboarding();
  }

  startAutoSync();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

init();
