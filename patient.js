// patient.js — 患者マイページ

// catName is defined in i18n.js

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
      (metTags ? '<div style="margin-bottom:14px"><div style="font-size:11px;color:var(--ink4);margin-bottom:6px">主な変動</div><div style="display:flex;flex-wrap:wrap;gap:6px">' + metTags + '</div></div>' : '') +
      '<div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:16px">' +
        '<button class="pt-tab pt-tab--active" onclick="switchPatientTab(this,\'metabolite\')" data-tab="metabolite">🔬 個別代謝物</button>' +
        '<button class="pt-tab" onclick="switchPatientTab(this,\'advice\')" data-tab="advice">🌿 生活で気をつけること</button>' +
      '</div>' +
      '<div id="patient-tab-metabolite">' +
        '<div id="patient-trend-chart" style="margin-bottom:16px"></div>' +
        '<div id="patient-metabolite-table"><div style="color:var(--ink4);font-size:12px;padding:8px">読み込み中...</div></div>' +
      '</div>' +
      '<div id="patient-tab-advice" style="display:none"><div id="patient-insights-box"></div></div>';

    renderTrendChart(s.patient_id, s.category);
    loadMetaboliteTable(s.patient_id, s.category);

    fetchInsightsByCategory(s.patient_id, s.category).then(async function(ins) {
      const el2 = document.getElementById('patient-insights-box');
      if (!el2) return;
      if (!ins || !ins.patient_comment) {
        el2.innerHTML = '<div style="color:var(--ink4);font-size:13px;padding:12px">' + t('patient.noData') + '</div>';
        return;
      }
      el2.innerHTML = '<div style="color:var(--ink4);font-size:12px;padding:8px">' + t('patient.loading') + '</div>';
      const translated = await translateText(ins.patient_comment, currentLang);
      el2.innerHTML = '<div class="insight-box insight-box--amber"><div class="insight-label">🗒 ' + t('patient.advice') + '</div><div>' + translated + '</div></div>';
    });
  });
}

function switchPatientTab(btn, tab) {
  document.querySelectorAll('.pt-tab').forEach(function(b) { b.classList.remove('pt-tab--active'); });
  btn.classList.add('pt-tab--active');
  document.getElementById('patient-tab-metabolite').style.display = tab === 'metabolite' ? '' : 'none';
  document.getElementById('patient-tab-advice').style.display = tab === 'advice' ? '' : 'none';
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

    // カテゴリの化合物を取得
    const compounds = await dbSelect('compound_categories',
      'category=eq.' + encodeURIComponent(category) + '&select=compound,weight&order=weight.desc');
    if (!compounds.length) { el.innerHTML = ''; return; }

    const compList = compounds.map(function(c) { return '"' + c.compound + '"'; }).join(',');

    // 全測定日のfactデータを取得
    const facts = await dbSelect('fact',
      'patient_id=eq.' + patientId + '&compound=in.(' + compList + ')&select=compound,sample_value,baseline,log2fc,measured_at&order=measured_at.asc');

    if (!facts.length) { el.innerHTML = ''; return; }

    // 測定日一覧
    const dates = [];
    facts.forEach(function(f) {
      if (f.measured_at && dates.indexOf(f.measured_at) === -1) dates.push(f.measured_at);
    });
    dates.sort();

    const W = Math.max(el.offsetWidth || 400, 300);
    const H = 200;
    const padL = 52, padR = 20, padT = 24, padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // log2FCの範囲
    const log2fcs = facts.filter(function(f) { return f.log2fc != null; }).map(function(f) { return Number(f.log2fc); });
    if (!log2fcs.length) { el.innerHTML = ''; return; }
    const maxV = Math.max(Math.abs(Math.max.apply(null, log2fcs)), Math.abs(Math.min.apply(null, log2fcs)), 1) * 1.2;

    // Y軸（-maxV〜+maxV）
    var yAxis = '';
    var zeroY = padT + chartH / 2;

    // ゼロライン
    yAxis += '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (W - padR) + '" y2="' + zeroY + '" stroke="#2D6A4F" stroke-width="1" stroke-dasharray="2,2"/>';
    yAxis += '<text x="' + (padL - 4) + '" y="' + (zeroY + 4) + '" text-anchor="end" font-size="9" fill="#8FAAA0">0</text>';

    // Y軸グリッド
    [-2, -1, 1, 2].forEach(function(v) {
      if (Math.abs(v) > maxV) return;
      var y = padT + chartH / 2 - (v / maxV) * (chartH / 2);
      yAxis += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#D4E6DD" stroke-width="1"/>';
      yAxis += '<text x="' + (padL - 4) + '" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="#8FAAA0">' + v + '</text>';
    });

    // Y軸ラベル（上：高い↑赤、下：低い↓青）
    yAxis += '<text x="14" y="' + (padT + 10) + '" text-anchor="middle" font-size="9" fill="#B03A2E" font-weight="bold">高い↑</text>';
    yAxis += '<text x="14" y="' + (padT + chartH - 4) + '" text-anchor="middle" font-size="9" fill="#4A90D9" font-weight="bold">低い↓</text>';

    // X軸ラベル
    var xLabels = '';
    dates.forEach(function(d, i) {
      var x = dates.length === 1 ? padL + chartW / 2 : padL + (chartW / (dates.length - 1)) * i;
      xLabels += '<text x="' + x + '" y="' + (H - 6) + '" text-anchor="middle" font-size="9" fill="#8FAAA0">' + d.slice(0, 10) + '</text>';
      xLabels += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (padT + chartH) + '" stroke="#D4E6DD" stroke-width="1"/>';
    });

    // X軸ラベル
    xLabels += '<text x="' + (padL + chartW / 2) + '" y="' + (H - 22) + '" text-anchor="middle" font-size="9" fill="#8FAAA0">測定回</text>';

    // log2fcがある化合物だけプロット（最大8件）
    var dots = '';
    var compoundsWithData = compounds.filter(function(c) {
      return facts.some(function(f) { return f.compound === c.compound && f.log2fc != null; });
    }).slice(0, 8);
    var topCompounds = compoundsWithData.length > 0 ? compoundsWithData : compounds.slice(0, 5);
    topCompounds.forEach(function(c, ci) {
      var compFacts = facts.filter(function(f) { return f.compound === c.compound && f.log2fc != null; });
      compFacts.forEach(function(f) {
        var di = dates.indexOf(f.measured_at);
        if (di === -1) return;
        var x = dates.length === 1 ? padL + chartW / 2 : padL + (chartW / (dates.length - 1)) * di;
        var y = padT + chartH / 2 - (Number(f.log2fc) / maxV) * (chartH / 2);
        var color = Number(f.log2fc) >= 0 ? '#B03A2E' : '#4A90D9';
        var tipText = c.compound + ' | 実測値:' + (f.sample_value != null ? Number(f.sample_value).toFixed(2) : '—') + ' | 基準値:' + (f.baseline != null ? Number(f.baseline).toFixed(2) : '—') + ' | log2FC:' + Number(f.log2fc).toFixed(3);
        dots += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + color + '" stroke="#fff" stroke-width="1.5" opacity="0.85"' +
          ' onmouseover="showChartTooltip(event,\'' + tipText.replace(/'/g, '') + '\')"' +
          ' onmouseout="hideChartTooltip()"/>';
      });
    });

    el.innerHTML =
      '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="overflow:visible;display:block">' +
        yAxis + xLabels + dots +
      '</svg>';

  } catch(e) { el.innerHTML = ''; }
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
      'patient_id=eq.' + patientId + '&compound=in.(' + compList + ')&select=compound,sample_value,baseline,measured_at&order=measured_at.asc');

    // 測定日一覧
    var dates = [];
    facts.forEach(function(f) {
      if (f.measured_at && dates.indexOf(f.measured_at) === -1) dates.push(f.measured_at);
    });
    dates.sort();

    // compound→日付→値のマップ
    var factMap = {};
    facts.forEach(function(f) {
      if (!factMap[f.compound]) factMap[f.compound] = {};
      factMap[f.compound][f.measured_at] = f;
    });

    // ヘッダー
    var thDates = dates.map(function(d) {
      return '<th>実測値 (' + d.slice(0, 10).replace(/-/g, '/') + ')</th>';
    }).join('');

    var rows = '';
    compounds.forEach(function(c) {
      var baseline = '—';
      var prevVal = null;
      var cells = '';

      dates.forEach(function(d, di) {
        var f = factMap[c.compound] && factMap[c.compound][d];
        var val = f && f.sample_value != null ? Number(f.sample_value) : null;
        if (f && f.baseline != null && baseline === '—') baseline = Number(f.baseline).toFixed(2);

        var prevCell = '';
        if (di === dates.length - 1 && dates.length > 1 && prevVal != null && val != null) {
          var diff = val - prevVal;
          var sign = diff > 0 ? '+' : '';
          prevCell = '<td style="font-size:11px;color:' + (diff > 0 ? '#B03A2E' : '#2D6A4F') + '">' + sign + diff.toFixed(2) + '</td>';
        }
        cells += '<td style="font-family:var(--font-mono)">' + (val != null ? val.toFixed(2) : '—') + '</td>';
        prevVal = val;
      });

      // 前回比（最後の列）
      var lastF = factMap[c.compound] && dates.length > 0 ? factMap[c.compound][dates[dates.length - 1]] : null;
      var prevF = factMap[c.compound] && dates.length > 1 ? factMap[c.compound][dates[dates.length - 2]] : null;
      var prevCompare = '—';
      if (lastF && prevF && lastF.sample_value != null && prevF.sample_value != null) {
        var diff = Number(lastF.sample_value) - Number(prevF.sample_value);
        var sign = diff > 0 ? '+' : '';
        prevCompare = '<span style="color:' + (diff > 0 ? '#B03A2E' : '#2D6A4F') + '">' + sign + diff.toFixed(2) + '</span>';
      }

      rows += '<tr>' +
        '<td>' + c.compound + '</td>' +
        '<td><span class="rank-badge" style="background:var(--emerald);color:#fff;font-size:11px">' + c.weight + '</span></td>' +
        '<td style="font-family:var(--font-mono);color:var(--ink4)">' + baseline + '</td>' +
        cells +
        '<td>' + prevCompare + '</td>' +
        '</tr>';
    });

    el.innerHTML = '<table class="score-table" style="margin-top:4px;width:100%">' +
      '<thead><tr><th>' + t('patient.compound') + '</th><th>' + t('patient.weight') + '</th><th>' + t('patient.baseline') + '</th>' + thDates + t('patient.prevDiff') + '</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>';
  } catch(e) {
    el.innerHTML = '<div style="color:var(--ink4);font-size:12px">エラー</div>';
  }
}
