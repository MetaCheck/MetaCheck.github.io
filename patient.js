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
    ? '⚠ ' + eCount + '項目で変動が大きく検出されました。詳細はクリニックにご相談ください。'
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
  grid.innerHTML = scores.map(function(s, i) {
    const rank = s.rank || '—';
    const wavg = s.wavg_absfc ? Number(s.wavg_absfc).toFixed(3) : '0';
    const barW = Math.min(100, Number(wavg) * 50);
    return '<div class="pt-score-row" onclick="selectPatientScore(' + i + ',this)">' +
      '<span class="pt-score-name">' + catName(s.category) + '</span>' +
      '<div class="pt-score-bar-wrap">' +
        '<div class="pt-score-bar rank-' + rank + '-bar" style="width:' + barW + '%"></div>' +
      '</div>' +
      '<span class="rank-badge rank-' + rank + '" style="width:28px;height:28px;font-size:13px">' + rank + '</span>' +
    '</div>';
  }).join('');
}

function selectPatientScore(index, el) {
  document.querySelectorAll('.pt-score-row').forEach(function(r) { r.classList.remove('active'); });
  if (el) el.classList.add('active');

  const s = window._patientScores && window._patientScores[index];
  if (!s) return;

  const det = document.getElementById('patient-category-detail');
  const card = document.getElementById('patient-detail-card');
  const title = document.getElementById('patient-detail-title');
  if (!det || !card || !title) return;

  det.removeAttribute('hidden');
  title.textContent = catName(s.category);
  const rank = s.rank || '—';

  card.innerHTML = '<div style="color:var(--ink4);font-size:12px;padding:8px">読み込み中...</div>';

  fetchCategoryResults(s.patient_id).then(function(results) {
    const cr = results.find(function(r) { return r.category === s.category; });
    const metTags = cr && cr.metabolites ? cr.metabolites.split('、').map(function(m) {
      const dir = m.includes('↓') ? 'down' : m.includes('↑') ? 'up' : 'neutral';
      return '<span class="metabolite-tag ' + dir + '">' + m.trim() + '</span>';
    }).join('') : '';

    card.innerHTML =
      '<div class="detail-card__title">' +
        '<span class="rank-badge rank-' + rank + '">' + rank + '</span> ' + catName(s.category) +
      '</div>' +
      '<div style="font-size:12px;color:var(--ink4);margin-bottom:10px">' +
        'WAVG_absFC: <strong style="font-family:var(--font-mono);color:var(--ink2)">' + Number(s.wavg_absfc).toFixed(4) + '</strong>' +
      '</div>' +
      (metTags ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">' + metTags + '</div>' : '') +
      '<div id="patient-trend-chart" style="margin-bottom:16px"></div>' +
      '<div id="patient-insights-box"></div>' +
      '<div id="patient-metabolite-table"><div style="color:var(--ink4);font-size:12px;padding:8px">読み込み中...</div></div>';

    // 推移グラフ描画
    renderTrendChart(s.patient_id, s.category);

    fetchInsightsByCategory(s.patient_id, s.category).then(function(ins) {
      const el2 = document.getElementById('patient-insights-box');
      if (!el2 || !ins) return;
      el2.innerHTML =
        (ins.interpretation ? '<div class="insight-box insight-box--blue"><div class="insight-label">📋 解釈</div><div>' + ins.interpretation + '</div></div>' : '') +
        (ins.recommendation ? '<div class="insight-box insight-box--green"><div class="insight-label">💡 推奨</div><div>' + ins.recommendation + '</div></div>' : '') +
        (ins.patient_comment ? '<div class="insight-box insight-box--amber"><div class="insight-label">🗒 生活で気をつけること</div><div>' + ins.patient_comment + '</div></div>' : '');
    });

    loadMetaboliteTable(s.patient_id, s.category);
  });
}

async function renderTrendChart(patientId, category) {
  const el = document.getElementById('patient-trend-chart');
  if (!el) return;

  try {
    const encoded = category.split('').map(function(c) {
      if (c === ' ') return '%20';
      if (c === '/') return '%2F';
      return c;
    }).join('');
    const allScores = await dbSelect('scores',
      'patient_id=eq.' + patientId + '&category=eq.' + encoded + '&select=wavg_absfc,rank,measured_at&order=measured_at.asc');

    if (!allScores.length) { el.innerHTML = ''; return; }

    const W = el.offsetWidth || 300;
    const H = 160;
    const padL = 48, padR = 16, padT = 20, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const vals = allScores.map(function(s) { return Number(s.wavg_absfc) || 0; });
    const maxV = Math.max.apply(null, vals) * 1.2 || 1;

    const rankColor = { A: '#2D6A4F', B: '#3A7D44', C: '#B8860B', D: '#D4600A', E: '#B03A2E' };

    // SVGで描画
    let circles = '';
    let labels = '';
    let polyline = '';
    const points = [];

    allScores.forEach(function(s, i) {
      const x = allScores.length === 1
        ? padL + chartW / 2
        : padL + (chartW / (allScores.length - 1)) * i;
      const y = padT + chartH - (vals[i] / maxV) * chartH;
      const color = rankColor[s.rank] || '#8FAAA0';
      points.push(x + ',' + y);
      circles += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="' + color + '" stroke="#fff" stroke-width="2"/>';
      circles += '<text x="' + x + '" y="' + (y - 10) + '" text-anchor="middle" font-size="10" fill="' + color + '" font-weight="bold">' + s.rank + '</text>';
      const dateStr = s.measured_at ? s.measured_at.slice(0, 10) : '';
      labels += '<text x="' + x + '" y="' + (H - 4) + '" text-anchor="middle" font-size="9" fill="#8FAAA0">' + dateStr + '</text>';
    });

    if (points.length > 1) {
      polyline = '<polyline points="' + points.join(' ') + '" fill="none" stroke="#52B788" stroke-width="2" stroke-dasharray="4,2"/>';
    }

    // Y軸
    let yAxis = '';
    for (var i = 0; i <= 4; i++) {
      const yv = (maxV / 4) * i;
      const y = padT + chartH - (yv / maxV) * chartH;
      yAxis += '<line x1="' + (padL - 4) + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#D4E6DD" stroke-width="1"/>';
      yAxis += '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#8FAAA0">' + yv.toFixed(2) + '</text>';
    }

    el.innerHTML =
      '<div style="font-size:11px;color:var(--ink4);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">📈 推移グラフ</div>' +
      '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="overflow:visible">' +
        yAxis + polyline + circles + labels +
      '</svg>';

  } catch(e) {
    el.innerHTML = '';
  }
}

async function loadMetaboliteTable(patientId, category) {
  const el = document.getElementById('patient-metabolite-table');
  if (!el) return;
  try {
    const compounds = await dbSelect('compound_categories',
      'category=eq.' + encodeURIComponent(category) + '&select=compound,weight&order=weight.desc');
    if (!compounds.length) { el.innerHTML = ''; return; }
    const compList = compounds.map(function(c) { return '"' + c.compound + '"'; }).join(',');
    const facts = await dbSelect('fact',
      'patient_id=eq.' + patientId + '&compound=in.(' + compList + ')&select=compound,sample_value,measured_at');
    const factMap = {};
    facts.forEach(function(f) { factMap[f.compound] = f; });
    let rows = '';
    compounds.forEach(function(c) {
      const f = factMap[c.compound];
      rows += '<tr>' +
        '<td>' + c.compound + '</td>' +
        '<td><span class="rank-badge" style="background:var(--emerald);color:#fff;font-size:11px">' + c.weight + '</span></td>' +
        '<td style="font-family:var(--font-mono)">' + (f ? f.sample_value : '—') + '</td>' +
        '<td style="font-size:11px;color:var(--ink4)">' + (f ? f.measured_at : '—') + '</td>' +
        '</tr>';
    });
    el.innerHTML = '<table class="score-table" style="margin-top:12px">' +
      '<thead><tr><th>代謝物</th><th>重要度</th><th>実測値</th><th>測定日</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>';
  } catch(e) {
    el.innerHTML = '<div style="color:var(--ink4);font-size:12px">エラー</div>';
  }
}
