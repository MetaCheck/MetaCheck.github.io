// ═══════════════════════════════════════════
//  patient.js — 患者マイページ
// ═══════════════════════════════════════════

async function renderPatientPage(patient) {
  // ヘッダー情報セット
  document.getElementById('patient-avatar').textContent = patient.id.slice(-3);
  document.getElementById('patient-name-display').textContent = patient.id;
  document.getElementById('patient-display-id').textContent = patient.id;
  document.getElementById('patient-display-name').textContent = patient.id;

  const meta = [patient.sex, patient.country, patient.age ? patient.age + '歳' : ''].filter(Boolean);
  document.getElementById('patient-display-meta').textContent = meta.join(' / ');
  document.getElementById('patient-display-date').textContent =
    patient.created_at ? new Date(patient.created_at).toLocaleDateString('ja-JP') : '';

  // スコア取得・描画
  try {
    const scores = await fetchScores(patient.id);
    renderScoreGrid(scores, patient.id);
  } catch (e) {
    console.error('スコア取得失敗', e);
  }

  // 解析依頼ボタン
  document.getElementById('btn-request-analysis')?.addEventListener('click', () => {
    openModal('modal-request');
  });
}

// スコアグリッド描画
function renderScoreGrid(scores, patientId) {
  const grid = document.getElementById('patient-score-grid');
  if (!grid) return;

  if (!scores.length) {
    grid.innerHTML = '<div style="color:var(--ink4);font-size:13px;">スコアデータがありません</div>';
    return;
  }

  // WAVGの最大値（バー計算用）
  const maxWavg = Math.max(...scores.map(s => s.wavg_absfc || 0), 1);

  grid.innerHTML = scores.map(s => {
    const rank = s.rank || '—';
    const wavg = s.wavg_absfc ? s.wavg_absfc.toFixed(3) : '—';
    const barW = Math.min(100, ((s.wavg_absfc || 0) / maxWavg) * 100);
    return `
      <div class="score-card fade-up" onclick="selectPatientCategory('${patientId}','${s.category}')">
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

// カテゴリ詳細選択
async function selectPatientCategory(patientId, category) {
  // カードのactive状態更新
  document.querySelectorAll('.score-card').forEach(c => c.classList.remove('active'));
  event?.currentTarget?.classList.add('active');

  const section = document.getElementById('patient-category-detail');
  const card = document.getElementById('patient-detail-card');
  const title = document.getElementById('patient-detail-title');
  if (!section || !card || !title) return;

  title.textContent = category;
  section.style.display = 'block';

  // scoresからこのカテゴリのデータを取得
  try {
    const rows = await dbSelect('scores',
      `patient_id=eq.${patientId}&category=eq.${encodeURIComponent(category)}&select=*`);
    const s = rows[0];
    if (!s) { card.innerHTML = '<div style="color:var(--ink4)">データなし</div>'; return; }

    const rank = s.rank || '—';
    card.innerHTML = `
      <div class="detail-card__title">
        <span class="rank-badge rank-${rank}">${rank}</span>
        ${category}
      </div>
      <div class="detail-card__body">
        <div style="margin-bottom:8px">
          <span style="color:var(--ink4);font-size:11px">WAVG_absFC：</span>
          <strong style="font-family:var(--font-mono)">${s.wavg_absfc?.toFixed(4) || '—'}</strong>
        </div>
      </div>`;
  } catch (e) {
    card.innerHTML = '<div style="color:var(--ink4)">データ取得エラー</div>';
  }
}
