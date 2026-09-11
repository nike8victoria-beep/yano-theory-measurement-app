import { db } from '../db.js';

export const TEXTURE_LABELS = { HARD: 'カチカチ', NORMAL: '普通', SOFT: 'フカフカ' };
export const SUNLIGHT_LABELS = { SUNNY: '日向', HALF_SHADE: '半日陰', SHADE: '日陰' };
export const PHASE_LABELS = { BEFORE: '施工前(BEFORE)', AFTER: '施工後(AFTER)' };

const MAX_INFILTRATION_SEC = 1800;
const MAX_GPS_ACCURACY_M = 50;

/**
 * Drives STEP1-4 of the measurement flow (spec section 4).
 * Does not persist anything to IndexedDB — onComplete receives the
 * finished draft so the caller (a later phase) can decide how to save it.
 *
 * @param {HTMLElement} container
 * @param {{ site: object|null, onCancel: () => void, onComplete: (draft: object) => void, onShowGuide?: () => void }} options
 */
export function renderMeasurementFlow(container, { site, onCancel, onComplete, onShowGuide }) {
  const draft = {
    siteId: site ? site.id : crypto.randomUUID(),
    isNewSite: !site,
    siteLabel: site ? site.label : null,
    lat: null,
    lng: null,
    gps_accuracy_m: null,
    phase: 'BEFORE',
    texture: null,
    sunlight: null,
    photo_blob: null,
    photoPreviewUrl: null,
    infiltration_time_sec: null,
    flag_review: false,
  };

  let step = 1;

  function goTo(nextStep) {
    step = nextStep;
    renderCurrentStep();
  }

  function renderCurrentStep() {
    if (step === 1) {
      renderStep1(container, draft, { site, onCancel, onNext: () => goTo(2), onShowGuide });
    } else if (step === 2) {
      renderStepPhoto(container, draft, { onBack: () => goTo(1), onNext: () => goTo(3) });
    } else if (step === 3) {
      renderStepTextureSunlight(container, draft, { onBack: () => goTo(2), onNext: () => goTo(4) });
    } else if (step === 4) {
      renderStepTimer(container, draft, { onBack: () => goTo(3), onComplete: () => onComplete(draft) });
    }
  }

  renderCurrentStep();
}

function renderStepShell(container, { stepLabel, bodyHtml }) {
  container.innerHTML = `
    <div class="step-view">
      <div class="step-progress">${stepLabel}</div>
      ${bodyHtml}
    </div>
  `;
}

// ---- STEP1: 地点情報 ----

async function renderStep1(container, draft, { site, onCancel, onNext, onShowGuide }) {
  renderStepShell(container, {
    stepLabel: 'STEP1 / 4 ・ 地点情報',
    bodyHtml: `
      <h1>地点情報</h1>

      ${
        draft.isNewSite
          ? `
            <label class="field-label" for="site-label-input">地点名(任意)</label>
            <input type="text" id="site-label-input" class="text-input" placeholder="例: 裏庭の斜面" value="${draft.siteLabel || ''}">
          `
          : `<div class="card"><strong>${site.label || `${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}`}</strong> で計測します</div>`
      }

      <div class="field-label">位置情報</div>
      <div class="card gps-status" data-el="gps-status">取得中...</div>
      <button type="button" class="secondary" data-action="retry-gps" hidden>位置情報を再取得</button>
      <button type="button" class="link-button" data-action="open-guide" hidden>うまく取得できない場合はこちら</button>

      <div class="field-label">計測フェーズ</div>
      <div class="choice-grid" data-group="phase">
        <button type="button" class="choice-btn" data-value="BEFORE">施工前(BEFORE)</button>
        <button type="button" class="choice-btn" data-value="AFTER">施工後(AFTER)</button>
      </div>

      <div class="step-actions">
        <button type="button" class="secondary" data-action="cancel">やめる</button>
        <button type="button" class="primary" data-action="next" disabled>次へ</button>
      </div>
    `,
  });

  container.querySelector('[data-action="cancel"]').addEventListener('click', onCancel);

  const labelInput = container.querySelector('#site-label-input');
  if (labelInput) {
    labelInput.addEventListener('input', () => {
      draft.siteLabel = labelInput.value.trim() || null;
    });
  }

  const phaseButtons = container.querySelectorAll('[data-group="phase"] .choice-btn');
  function updatePhaseButtons() {
    phaseButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.value === draft.phase));
  }
  phaseButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      draft.phase = btn.dataset.value;
      updatePhaseButtons();
    });
  });

  // Default phase proposal: AFTER when the site already has observations.
  const existingObservations = site ? await db.getObservationsBySite(site.id) : [];
  draft.phase = existingObservations.length > 0 ? 'AFTER' : 'BEFORE';
  updatePhaseButtons();

  const statusEl = container.querySelector('[data-el="gps-status"]');
  const retryBtn = container.querySelector('[data-action="retry-gps"]');
  const guideLinkBtn = container.querySelector('[data-action="open-guide"]');
  const nextBtn = container.querySelector('[data-action="next"]');

  function fetchLocation() {
    statusEl.textContent = '現在地を取得中...';
    retryBtn.hidden = true;
    guideLinkBtn.hidden = true;
    nextBtn.disabled = true;

    if (!('geolocation' in navigator)) {
      statusEl.textContent = 'この端末では位置情報が利用できません。';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        draft.lat = position.coords.latitude;
        draft.lng = position.coords.longitude;
        draft.gps_accuracy_m = position.coords.accuracy;
        statusEl.innerHTML = `緯度: ${draft.lat.toFixed(6)} / 経度: ${draft.lng.toFixed(6)}<br>精度: 約${Math.round(draft.gps_accuracy_m)}m`;
        nextBtn.disabled = false;
      },
      (error) => {
        statusEl.textContent = `位置情報の取得に失敗しました(${error.message})`;
        retryBtn.hidden = false;
        guideLinkBtn.hidden = !onShowGuide;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  retryBtn.addEventListener('click', fetchLocation);
  if (onShowGuide) {
    guideLinkBtn.addEventListener('click', () => onShowGuide());
  }
  nextBtn.addEventListener('click', onNext);

  fetchLocation();
}

// ---- STEP2: 写真撮影 ----

function renderStepPhoto(container, draft, { onBack, onNext }) {
  renderStepShell(container, {
    stepLabel: 'STEP2 / 4 ・ 写真撮影',
    bodyHtml: `
      <h1>写真撮影</h1>
      <p class="hint">移植ゴテを地面に立て、柄の先端くらいの高さにスマホを構えて、真上から撮影してください。ズーム操作は使わないでください(機種によるズーム倍率の差を避けるため)。</p>

      <div class="photo-area card">
        ${draft.photoPreviewUrl ? `<img class="photo-preview" src="${draft.photoPreviewUrl}" alt="撮影した写真">` : '<p class="empty-hint">まだ写真がありません</p>'}
      </div>

      <input type="file" accept="image/*" capture="environment" id="photo-input" hidden>
      <button type="button" class="secondary" data-action="capture">${draft.photo_blob ? '撮り直す' : '写真を撮影する'}</button>

      <div class="step-actions">
        <button type="button" class="secondary" data-action="back">戻る</button>
        <button type="button" class="primary" data-action="next" ${draft.photo_blob ? '' : 'disabled'}>次へ</button>
      </div>
    `,
  });

  const fileInput = container.querySelector('#photo-input');
  container.querySelector('[data-action="capture"]').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (draft.photoPreviewUrl) URL.revokeObjectURL(draft.photoPreviewUrl);
    draft.photo_blob = file;
    draft.photoPreviewUrl = URL.createObjectURL(file);
    renderStepPhoto(container, draft, { onBack, onNext });
  });

  container.querySelector('[data-action="back"]').addEventListener('click', onBack);
  container.querySelector('[data-action="next"]').addEventListener('click', onNext);
}

// ---- STEP3: 質感・日照 ----

function renderStepTextureSunlight(container, draft, { onBack, onNext }) {
  renderStepShell(container, {
    stepLabel: 'STEP3 / 4 ・ 質感・日照',
    bodyHtml: `
      <h1>質感・日照</h1>

      <div class="field-label">① 移植ゴテを落とした感じ</div>
      <p class="hint">移植ゴテを腰の高さに持ち、手を自然に離して地面に落としてください。刺さり方・跳ね返り方の感触で選んでください。</p>
      <div class="choice-grid" data-group="texture">
        ${Object.entries(TEXTURE_LABELS)
          .map(([value, label]) => `<button type="button" class="choice-btn ${draft.texture === value ? 'active' : ''}" data-value="${value}">${label}</button>`)
          .join('')}
      </div>
      ${draft.texture ? '<p class="hint">(任意)しゃがんで土の匂いを嗅いでみてください。</p>' : ''}

      <div class="field-label">② 表層の見た目・日照</div>
      <div class="choice-grid" data-group="sunlight">
        ${Object.entries(SUNLIGHT_LABELS)
          .map(([value, label]) => `<button type="button" class="choice-btn ${draft.sunlight === value ? 'active' : ''}" data-value="${value}">${label}</button>`)
          .join('')}
      </div>

      <div class="step-actions">
        <button type="button" class="secondary" data-action="back">戻る</button>
        <button type="button" class="primary" data-action="next" ${draft.texture && draft.sunlight ? '' : 'disabled'}>次へ</button>
      </div>
    `,
  });

  container.querySelectorAll('[data-group="texture"] .choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      draft.texture = btn.dataset.value;
      renderStepTextureSunlight(container, draft, { onBack, onNext });
    });
  });

  container.querySelectorAll('[data-group="sunlight"] .choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      draft.sunlight = btn.dataset.value;
      renderStepTextureSunlight(container, draft, { onBack, onNext });
    });
  });

  container.querySelector('[data-action="back"]').addEventListener('click', onBack);
  container.querySelector('[data-action="next"]').addEventListener('click', onNext);
}

// ---- STEP4: 浸透タイマー ----

function renderStepTimer(container, draft, { onBack, onComplete }) {
  let timerState = draft.infiltration_time_sec != null ? 'stopped' : 'idle'; // idle | running | stopped
  let startedAt = null;
  let intervalId = null;

  function evaluateFlagReview() {
    const flags = [];
    if (draft.infiltration_time_sec <= 0 || draft.infiltration_time_sec > MAX_INFILTRATION_SEC) {
      flags.push(`浸透時間が異常値です(0秒以下または${MAX_INFILTRATION_SEC}秒超)`);
    }
    if (draft.gps_accuracy_m != null && draft.gps_accuracy_m > MAX_GPS_ACCURACY_M) {
      flags.push(`GPS精度が${MAX_GPS_ACCURACY_M}mを超えています`);
    }
    draft.flag_review = flags.length > 0;
    return flags;
  }

  function render() {
    const elapsed =
      draft.infiltration_time_sec != null
        ? draft.infiltration_time_sec
        : timerState === 'running'
        ? Math.floor((Date.now() - startedAt) / 1000)
        : 0;

    const flags = timerState === 'stopped' ? evaluateFlagReview() : [];

    renderStepShell(container, {
      stepLabel: 'STEP4 / 4 ・ 浸透タイマー',
      bodyHtml: `
        <h1>浸透タイマー</h1>
        <p class="hint">移植ゴテを地面に斜め45度くらいに立てかけ、その中腹を伝わせるように500mlの水をすべて注いでください。注ぎ終わったらタイマーをスタートしてください。</p>

        <div class="timer-display card">${elapsed}<span class="timer-unit">秒</span></div>

        ${flags.length > 0 ? `<div class="flag-warning">⚠ ${flags.join(' / ')}(要確認としてマークされます)</div>` : ''}

        <div class="timer-actions">
          ${timerState === 'idle' ? '<button type="button" class="primary" data-action="start">スタート</button>' : ''}
          ${timerState === 'running' ? '<button type="button" class="primary" data-action="stop">ストップ</button>' : ''}
          ${timerState === 'stopped' ? '<button type="button" class="secondary" data-action="reset">やり直す</button>' : ''}
        </div>

        <div class="step-actions">
          <button type="button" class="secondary" data-action="back">戻る</button>
          <button type="button" class="primary" data-action="submit" ${timerState === 'stopped' ? '' : 'disabled'}>送信</button>
        </div>
      `,
    });

    const startBtn = container.querySelector('[data-action="start"]');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        timerState = 'running';
        startedAt = Date.now();
        render();
        intervalId = setInterval(render, 200);
      });
    }

    const stopBtn = container.querySelector('[data-action="stop"]');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        clearInterval(intervalId);
        draft.infiltration_time_sec = Math.round((Date.now() - startedAt) / 1000);
        timerState = 'stopped';
        render();
      });
    }

    const resetBtn = container.querySelector('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        timerState = 'idle';
        draft.infiltration_time_sec = null;
        draft.flag_review = false;
        render();
      });
    }

    container.querySelector('[data-action="back"]').addEventListener('click', () => {
      clearInterval(intervalId);
      onBack();
    });

    const submitBtn = container.querySelector('[data-action="submit"]');
    if (timerState === 'stopped') {
      submitBtn.addEventListener('click', onComplete);
    }
  }

  render();
}
