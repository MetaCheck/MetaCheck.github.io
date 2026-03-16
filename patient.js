// patient.js — 患者マイページ

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
  'TCA Cycle': 'クエン酸回路',
  'Urea Cycle': '尿素回路',
};

function catName(cat) {
  if (!cat) return '';
  return currentLang === 'ja' ? (CAT_JA[cat.trim()] || cat) : cat;
}

async function renderPatientPage(patient) {
  document.getElementById('patient-avatar').textContent = patient.id.slice(-3);
  document.getElementById('patient-name-display').textContent = patient.id + ' さん';
  document.getElementById('patient-display-id').textContent = '患者ID: ' + patient.id;
  document.getElementById('patient-display-name').textContent = patient.id + ' さん';
  document.getElementById('patient-display-meta').textContent =
    [patient.sex, patient.country].filter(Boolean).join(' / ') || '';

  // 詳細セクションを確実に隠す
  const det = document.getElementById('patient-category-detail');
  if (det) det.setAttribute('hidden', '');

  try {
    const scores = await fetchScores(patient.id);
    window._patientScores = scores;
    renderPatientScores(scores);
    renderAlertBanner(scores);
  } catch(e) { console.error(e); }

  document.getElementById('btn-request-analysis')
    ?.addEventListener('click', () => openModal('modal-request'));
}

function renderAlertBanner(scores) {
  const eCount = scores.filter(s => s.rank === 'E').length;
  const banner = document.getElementById('patient-alert-banner');
  if (!banner) return;
  banner.textContent = eCount > 0
    ? `⚠ ${eCount}項目で変動が大きく検出されました。詳細はクリニックにご相談ください。`
    : '';
  banner.style.display = eCount > 0 ? 'block' : 'none';
}

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
    return `<div class="pt-score-row" onclick="selectPatientScore(${i},this)">
      <span class="pt-score-name">${catName(s.category)}</span>
      <div class="pt-score-bar-wrap">
        <div class="pt-score-bar rank-${rank}-bar" style="width:${barW}%"></div>
      </div>
      <span class="rank-badge rank-${rank}" style="width:28px;height:28px;font-size:13px">${rank}</span>
    </div>`;
  }).join('');
}

function selectPatientScore(index, el) {
  document.querySelectorAll('.pt-score-row').forEach(r => r.classList.remove('active'));
  el?.classList.add('active');

  const s = window._patientScores?.[index];
  if (!s) return;

  const det = document.getElementById('patient-category-detail');
  const card = document.getElementById('patient-detail-card');
  const title = document.getElementById('patient-detail-title');
  if (!det || !card || !title) return;

  det.removeAttribute('hidden');
  title.textContent = catName(s.category);
  const rank = s.rank || '—';

  card.innerHTML = `<div style="color:var(--ink4);font-size:12px;padding:8px">読み込み中...</div>`;

  fetchCategoryResult(s.patient_id).then(results => {
    const cr = results.find(r => r.category === s.category);
    const metTags = cr?.metabolites ? cr.metabolites.split('、').map(m => {
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
      <div id="patient-metabolite-table"><div style="color:var(--ink4);font-size:12px;padding:8px">読み込み中...</div></div>`;

    fetchInsightsByCategory(s.patient_id, s.category).then(ins => {
      const el2 = document.getElementById('patient-insights-box');
      if (!el2 || !ins) return;
      el2.innerHTML = `
        ${ins.interpretation ? `<div class="insight-box insight-box--blue"><div class="insight-label">📋 解釈</div><div>${ins.interpretation}</div></div>` : ''}
        ${ins.recommendation ? `<div class="insight-box insight-box--green"><div class="insight-label">💡 推奨</div><div>${ins.recommendation}</div></div>` : ''}
        ${ins.patient_comment ? `<div class="insight-box insight-box--amber"><div class="insight-label">🗒 生活で気をつけること</div><div>${ins.patient_comment}</div></div>` : ''}`;
    });

    loadMetaboliteTable(s.patient_id, s.category);
  });

async function loadMetaboliteTable(patientId, category) {
  const el = document.getElementById('patient-metabolite-table');
  if (!el) return;
  try {
    const compounds = await dbSelect('compound_categories',
      `category=eq.${encodeURIComponent(category)}&select=compound,weight&order=weight.desc`);
    if (!compounds.length) { el.innerHTML = ''; return; }
    const compList = compounds.map(c => `"${c.compound}"`).join(',');
    const facts = await dbSelect('fact',
      `patient_id=eq.${patientId}&compound=in.(${compList})&select=compound,sample_value,measured_at`);
    const factMap = {};
    facts.forEach(f => { factMap[f.compound] = f; });
    el.innerHTML = `<table class="score-table" style="margin-top:12px">
      <thead><tr><th>代謝物</th><th>重要度</th><th>実測値</th><th>測定日</th></tr></thead>
      <tbody>${compounds.map(c => {
        const f = factMap[c.compound];
        return `<tr>
          <td>${c.compound}</td>
          <td><span class="rank-badge" style="background:var(--emerald);color:#fff;font-size:11px">${c.weight}</span></td>
          <td style="font-family:var(--font-mono)">${f ? f.sample_value : '—'}</td>
          <td style="font-size:11px;color:var(--ink4)">${f ? f.measured_at : '—'}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch(e) {
    el.innerHTML = '<div style="color:var(--ink4);font-size:12px">エラー</div>';
  }
}
