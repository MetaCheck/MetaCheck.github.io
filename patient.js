// ═══════════════════════════════════════════
//  patient.js — 患者マイページ（150行以内）
// ═══════════════════════════════════════════

// カテゴリ日本語名マッピング
const CAT_JA = {
  'Amino acid / BCAA metabolism': 'アミノ酸・BCAA',
  'Cofactors / Vitamin B': '補酵素・ビタミンB',
  'Electrolyte / Minerals': '電解質・ミネラル',
  'Energy currency / OXPHOS': 'エネルギー産生',
  'Fatty acid metabolism': '脂肪酸代謝',
  'Folate / Methionine-SAM cycle': '葉酸・メチオニン回路',
  'Glycolysis': '解糖系',
  'Ketone body metabolism': 'ケトン体代謝',
  'Lipid detail': '脂質詳細',
  'Pentose Phosphate Pathway': 'ペントースリン酸回路',
  'Polyamine metabolism': 'ポリアミン代謝',
  'Purine metabolism': 'プリン代謝',
  'Pyrimidine metabolism': 'ピリミジン代謝',
  'Redox balance / Glutathione': '酸化還元・グルタチオン',
  'Redox balance / Glutathione ': '酸化還元・グルタチオン',
  'TCA Cycle': 'クエン酸回路',
  'Urea Cycle': '尿素回路',
};

function catName(cat) {
  return currentLang === 'ja' ? (CAT_JA[cat] || cat) : cat;
}

async function renderPatientPage(patient) {
  document.getElementById('patient-avatar').textContent = patient.id.slice(-3);
  document.getElementById('patient-name-display').textContent = patient.id + ' さん';
  document.getElementById('patient-display-id').textContent = '患者ID: ' + patient.id;
  document.getElementById('patient-display-name').textContent = patient.id + ' さん';
  document.getElementById('patient-display-meta').textContent =
    [patient.sex, patient.country].filter(Boolean).join(' / ') || '';

  try {
    const scores = await fetchScores(patient.id);
    window._patientScores = scores;
    renderPatientScores(scores);
    renderAlertBanner(scores);
  } catch(e) { console.error(e); }

  document.getElementById('btn-request-analysis')?.addEventListener('click', () => openModal('modal-request'));
}

// 警告バナー（Eランク数）
function renderAlertBanner(scores) {
  const eCount = scores.filter(s => s.rank === 'E').length;
  const banner = document.getElementById('patient-alert-banner');
  if (!banner) return;
  if (eCount > 0) {
    banner.textContent = `⚠ ${eCount}項目で変動が大きく検出されました。詳細はクリニックにご相談ください。`;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

// スコア一覧（横長バー形式）
function renderPatientScores(scores) {
  const grid = document.getElementById('patient-score-grid');
  if (!grid) return;
  if (!scores.length) {
    grid.innerHTML = '<div style="color:var(--ink4);padding:20px">スコアデータがありません</div>';
    return;
  }
  grid.innerHTML = scores.map((s, i) => {
    const rank = s.rank || '—';
    const wavg = s.wavg_absfc ? Number(s.wavg_absfc).toFixed(3) : '0';
    const barW = Math.min(100, Number(wavg) * 50);
    const name = catName(s.category);
    return `<div class="pt-score-row" onclick="selectPatientScore(${i},this)">
      <span class="pt-score-name">${name}</span>
      <div class="pt-score-bar-wrap"><div class="pt-score-bar rank-${rank}-bar" style="width:${barW}%"></div></div>
      <span class="rank-badge rank-${rank}" style="width:28px;height:28px;font-size:13px">${rank}</span>
    </div>`;
  }).join('');
}

// カテゴリ詳細表示
function selectPatientScore(index, el) {
  document.querySelectorAll('.pt-score-row').forEach(r => r.classList.remove('active'));
  el?.classList.add('active');

  const s = window._patientScores?.[index];
  if (!s) return;

  const section = document.getElementById('patient-category-detail');
  const card = document.getElementById('patient-detail-card');
  const title = document.getElementById('patient-detail-title');
  if (!section || !card || !title) return;

  section.style.display = 'block';
  title.textContent = catName(s.category);

  const rank = s.rank || '—';
  const metTags = s.metabolites ? s.metabolites.split('、').map(m => {
    const dir = m.includes('↓') ? 'down' : m.includes('↑') ? 'up' : 'neutral';
    return `<span class="metabolite-tag ${dir}">${m.trim()}</span>`;
  }).join('') : '';

  card.innerHTML = `
    <div class="detail-card__title">
      <span class="rank-badge rank-${rank}">${rank}</span> ${catName(s.category)}
    </div>
    <div style="font-size:12px;color:var(--ink4);margin-bottom:10px">
      WAVG_absFC: <strong style="font-family:var(--font-mono);color:var(--ink2)">${Number(s.wavg_absfc).toFixed(4)}</strong>
    </div>
    ${metTags ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">${metTags}</div>` : ''}
    <div id="patient-insights-box"></div>
    <div id="patient-metabolite-table">読み込み中...</div>`;

  // 臨床解釈を取得
  fetchInsightsByCategory(s.patient_id, s.category).then(ins => {
    const el = document.getElementById('patient-insights-box');
    if (!el || !ins) return;
    el.innerHTML = `
      ${ins.interpretation ? `<div class="insight-box insight-box--blue"><div class="insight-label">📋 解釈</div><div>${ins.interpretation}</div></div>` : ''}
      ${ins.recommendation ? `<div class="insight-box insight-box--green"><div class="insight-label">💡 推奨</div><div>${ins.recommendation}</div></div>` : ''}
      ${ins.patient_comment ? `<div class="insight-box insight-box--amber"><div class="insight-label">🗒 生活で気をつけること</div><div>${ins.patient_comment}</div></div>` : ''}
    `;
  });

  // factテーブルから代謝物データを取得
  loadMetaboliteTable(s.patient_id, s.category, s.measured_at);
}

// 代謝物テーブル
async function loadMetaboliteTable(patientId, category, measuredAt) {
  const el = document.getElementById('patient-metabolite-table');
  if (!el) return;
  try {
    // compound_categoriesからこのカテゴリの化合物リスト取得
    const compounds = await dbSelect('compound_categories',
      `category=eq.${encodeURIComponent(category)}&select=compound,weight&order=weight.desc`);

    if (!compounds.length) { el.innerHTML = ''; return; }

    // factから実測値取得
    const compoundList = compounds.map(c => c.compound).join(',');
    const facts = await dbSelect('fact',
      `patient_id=eq.${patientId}&compound=in.(${compoundList})&select=compound,sample_value,measured_at&order=measured_at`);

    const factMap = {};
    facts.forEach(f => {
      if (!factMap[f.compound]) factMap[f.compound] = [];
      factMap[f.compound].push(f);
    });

    el.innerHTML = `<table class="score-table" style="margin-top:12px">
      <thead><tr>
        <th>代謝物</th><th>重要度</th><th>実測値</th><th>測定日</th>
      </tr></thead>
      <tbody>${compounds.map(c => {
        const vals = factMap[c.compound] || [];
        const latest = vals[vals.length-1];
        return `<tr>
          <td>${c.compound}</td>
          <td><span class="rank-badge" style="background:var(--emerald);color:#fff;font-size:11px">${c.weight}</span></td>
          <td style="font-family:var(--font-mono)">${latest ? latest.sample_value : '—'}</td>
          <td style="font-size:11px;color:var(--ink4)">${latest ? latest.measured_at : '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } catch(e) {
    el.innerHTML = '<div style="color:var(--ink4);font-size:12px">テーブル取得エラー</div>';
  }
}
