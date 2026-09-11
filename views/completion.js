import { db } from '../db.js';
import { TEXTURE_LABELS, SUNLIGHT_LABELS, PHASE_LABELS } from './measurementFlow.js';

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * [4.0 完了画面]. If the saved observation is AFTER and a BEFORE observation
 * already exists for the same site, shows a simple before/after comparison
 * (infiltration time diff + side-by-side photos). No physical-quantity
 * conversion is performed, per spec section 5/9.
 *
 * @param {HTMLElement} container
 * @param {{ observation: object, site: object, onBack: () => void, title?: string }} options
 */
export async function renderCompletion(container, { observation, site, onBack, title = '投稿が完了しました' }) {
  const objectUrls = [];
  function toUrl(blob) {
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    return url;
  }

  let beforeObservation = null;
  if (observation.phase === 'AFTER') {
    const observations = await db.getObservationsBySite(observation.site_id);
    const beforeCandidates = observations
      .filter((o) => o.phase === 'BEFORE' && o.id !== observation.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    beforeObservation = beforeCandidates[0] || null;
  }

  const afterPhotoUrl = toUrl(observation.photo_blob);
  const beforePhotoUrl = beforeObservation ? toUrl(beforeObservation.photo_blob) : null;
  const siteLabel = site.label || `${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}`;

  let comparisonHtml = '';
  if (beforeObservation) {
    const diff = observation.infiltration_time_sec - beforeObservation.infiltration_time_sec;
    const diffLabel = diff === 0 ? '変化なし' : `${diff > 0 ? '+' : ''}${diff}秒`;

    comparisonHtml = `
      <div class="card comparison-card">
        <h2>Before / After 比較</h2>
        <div class="comparison-photos">
          <div class="comparison-photo-col">
            <div class="comparison-photo-label">BEFORE</div>
            ${beforePhotoUrl ? `<img class="photo-preview" src="${beforePhotoUrl}" alt="施工前の写真">` : '<p class="empty-hint">写真なし</p>'}
          </div>
          <div class="comparison-photo-col">
            <div class="comparison-photo-label">AFTER</div>
            ${afterPhotoUrl ? `<img class="photo-preview" src="${afterPhotoUrl}" alt="施工後の写真">` : '<p class="empty-hint">写真なし</p>'}
          </div>
        </div>
        <div class="comparison-metric">
          浸透時間: ${beforeObservation.infiltration_time_sec}秒 → ${observation.infiltration_time_sec}秒
          <span class="comparison-diff">(${diffLabel})</span>
        </div>
        <p class="hint">※ 物理量への換算は行っていません。生の秒数の変化のみを表示しています。</p>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="completion-view">
      <h1>${title}</h1>

      <div class="card">
        <div class="field-label">地点</div>
        <p>${siteLabel}</p>
        <div class="field-label">フェーズ</div>
        <p>${PHASE_LABELS[observation.phase]}</p>
        <div class="field-label">投稿日時</div>
        <p>${formatDateTime(observation.created_at)}</p>
        <div class="field-label">移植ゴテを落とした感じ</div>
        <p>${TEXTURE_LABELS[observation.texture]}</p>
        <div class="field-label">表層の見た目・日照</div>
        <p>${SUNLIGHT_LABELS[observation.sunlight]}</p>
        <div class="field-label">水はけ(浸透時間)</div>
        <p>${observation.infiltration_time_sec}秒</p>
        <div class="field-label">GPS精度</div>
        <p>約${Math.round(observation.gps_accuracy_m)}m</p>
        ${observation.flag_review ? '<div class="flag-warning">⚠ このデータは異常値の可能性があるため、要確認としてマークされています</div>' : ''}
        ${
          afterPhotoUrl && !beforeObservation
            ? `<div class="field-label">撮影した写真</div><img class="photo-preview" src="${afterPhotoUrl}" alt="撮影した写真">`
            : ''
        }
      </div>

      ${comparisonHtml}

      <button type="button" class="primary" data-action="back">マイ地点一覧へ戻る</button>
    </div>
  `;

  container.querySelector('[data-action="back"]').addEventListener('click', () => {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    onBack();
  });
}
