import { db } from '../db.js';
import { PHASE_LABELS } from './measurementFlow.js';

function formatCoords(lat, lng) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function formatDateTime(isoString) {
  if (!isoString) return '投稿なし';
  return new Date(isoString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function buildSiteRows() {
  const sites = await db.getAllSites();

  const rows = await Promise.all(
    sites.map(async (site) => {
      const observations = await db.getObservationsBySite(site.id);
      observations.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const latest = observations[observations.length - 1] || null;

      return {
        site,
        displayLabel: site.label || formatCoords(site.lat, site.lng),
        latestAt: latest ? latest.created_at : null,
        observations,
      };
    })
  );

  rows.sort((a, b) => (b.latestAt || b.site.created_at).localeCompare(a.latestAt || a.site.created_at));
  return rows;
}

export async function renderSiteList(container, { onNewSite, onMeasureAfter }) {
  container.innerHTML = `
    <div class="site-list-view">
      <div class="site-list-header">
        <h1>マイ地点一覧</h1>
        <button type="button" class="primary" data-action="new-site">新しい地点を計測</button>
      </div>
      <div class="site-list-body">読み込み中...</div>
    </div>
  `;

  container.querySelector('[data-action="new-site"]').addEventListener('click', onNewSite);

  const bodyEl = container.querySelector('.site-list-body');
  const rows = await buildSiteRows();

  if (rows.length === 0) {
    bodyEl.innerHTML = `<p class="empty-hint">まだ地点がありません。「新しい地点を計測」から始めましょう。</p>`;
    return;
  }

  bodyEl.innerHTML = rows
    .map(
      ({ site, displayLabel, latestAt, observations }) => `
        <div class="site-row card" data-site-id="${site.id}">
          <div class="site-row-info">
            <div class="site-row-label">${displayLabel}</div>
            <div class="site-row-date">直近の投稿: ${formatDateTime(latestAt)}</div>
          </div>
          ${
            observations.length > 0
              ? `
                <div class="observation-chip-list">
                  ${observations
                    .map(
                      (obs) => `
                        <div class="observation-chip">
                          <span class="obs-phase">${PHASE_LABELS[obs.phase]}</span>
                          <span class="obs-date">${formatDateTime(obs.created_at)}</span>
                          ${!obs.synced ? '<span class="sync-badge">未同期</span>' : ''}
                        </div>
                      `
                    )
                    .join('')}
                </div>
              `
              : ''
          }
          <button type="button" class="secondary" data-action="measure-after" data-site-id="${site.id}">
            この地点で施工後を計測
          </button>
        </div>
      `
    )
    .join('');

  bodyEl.querySelectorAll('[data-action="measure-after"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const site = rows.find((r) => r.site.id === btn.dataset.siteId).site;
      onMeasureAfter(site);
    });
  });
}
