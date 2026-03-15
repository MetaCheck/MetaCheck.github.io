// ═══════════════════════════════════════════
//  patient.js — 患者マイページ（150行以内）
// ═══════════════════════════════════════════

async function renderPatientPage(patient) {
  document.getElementById('patient-avatar').textContent = patient.id.slice(-3);
  document.getElementById('patient-name-display').textContent = patient.id + ' さん';
  document.getElementById('patient-display-id').textContent = patient.id;
  document.getElementById('patient-display-name').textContent = patient.id + ' さん';

  const meta = [patient.sex, patient.country, patient.age ? patient.age + '歳' : ''].filter(Boolean);
  document.getElementById('patient-display-meta').textContent = meta.join(' / ') || '—';

  try {
    const scores = await fetchScores(patient.id);
    renderScoreGrid(scores, patient.id);
  } catch (e) {
    console.error('スコア取得失敗', e);
  }

  document.getElementById('btn-request-analysis')?.addEventListener('click', () => {
    openModal('modal-request');
  });
}

// スコアグリッド描画
function renderScoreGrid(scores, patientId) {
  const grid = document.getElementById('patient-score-grid');
  if (!grid) return;

  if (!scores.length) {
    grid.innerHTML = '<div style="color:var(--ink4);font-size:13px;padding:20px">スコアデータがありません</div>';
    return;
  }

  // スコアをキャッシュ（詳細表示用）
  window._patientScores = scores;

  const maxWavg = Math.max(...scores.map(s => s.wavg_absfc || 0), 1);

  grid.innerHTML = scores.map((s, i) => {
    const rank = s.rank || '—';
    const wavg = s.wavg_absfc ? Number(s.wavg_absfc).toFixed(3) : '—';
    const barW = Math.min(100, ((s.wavg_absfc || 0) / maxWavg) * 100);
    return `
      <div class="score-card fade-up" onclick="selectPatientCategory(${i}, this)">
        <div class="score-card__rank rank-${rank}">${rank}</div>
        <div class="score-card__name">${s.category}</div>
        <div style="font-size:10px;color:var(--ink4);margin-top:4px;font-family:var(--font-mono)">
          WAVG ${wavg}
        </div>
        <div class="score-card__bar-wrap">
          <div class="score-card__bar rank-${rank}" style="width:${barW}%"></div>
        </div>
      </div>`;
  }).join('');
}

// カテゴリ詳細選択（scoresデータを直接使用）
function selectPatientCategory(index, cardEl) {
  document.querySelectorAll('.score-card').forEach(c => c.classList.remove('active'));
  cardEl?.classList.add('active');

  const section = document.getElementById('patient-category-detail');
  const card = document.getElementById('patient-detail-card');
  const title = document.getElementById('patient-detail-title');
  if (!section || !card || !title) return;

  const s = window._patientScores?.[index];
  if (!s) { card.innerHTML = '<div style="color:var(--ink4)">データなし</div>'; return; }

  section.style.display = 'block';
  title.textContent = s.category;

  const rank = s.rank || '—';

  // category_resultsから代謝物データを取得
  fetchCategoryResultsByPatientCategory(s).then(cr => {
    const metTags = cr?.metabolites ? cr.metabolites.split('、').map(m => {
      const dir = m.includes('↓') ? 'down' : m.includes('↑') ? 'up' : 'neutral';
      return `<span class="metabolite-tag ${dir}">${m.trim()}</span>`;
    }).join('') : '';

    card.innerHTML = `
      <div class="detail-card__title">
        <span class="rank-badge rank-${rank}">${rank}</span>
        ${s.category}
      </div>
      <div style="margin-bottom:8px;font-size:12px;color:var(--ink4)">
        WAVG_absFC：<strong style="font-family:var(--font-mono);color:var(--ink2)">
          ${Number(s.wavg_absfc).toFixed(4)}
        </strong>
      </div>
      ${metTags ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${metTags}</div>` : ''}`;
  });
}

// category_resultsから該当カテゴリを取得
async function fetchCategoryResultsByPatientCategory(score) {
  try {
    const rows = await dbSelect('category_results',
      `category=eq.${encodeURIComponent(score.category)}&select=metabolites&limit=1`);
    return rows[0] || null;
  } catch (e) {
    return null;
  }
}
