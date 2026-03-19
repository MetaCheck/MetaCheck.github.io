// ═══════════════════════════════════════════
//  clinic.js — クリニックポータル
// ═══════════════════════════════════════════

const CAT_JA_CLINIC = {
  'Amino acid / BCAA metabolism': 'アミノ酸・BCAA代謝状態',
  'Cofactors / Vitamin B': '補酵素・ビタミンB機能',
  'Electrolyte / Minerals': '電解質・ミネラル恒常性',
  'Energy currency / OXPHOS': '細胞エネルギー産生機能',
  'Fatty acid metabolism': '脂肪酸代謝機能',
  'Folate / Methionine-SAM cycle': 'メチル化・一炭素代謝機能',
  'Folate / Methionine–SAM cycle': 'メチル化・一炭素代謝機能',
  'Glycolysis': '糖代謝（解糖系）活性',
  'Ketone body metabolism': 'ケトン体利用機能',
  'Lipid detail': '脂質組成・質的バランス',
  'Pentose Phosphate Pathway': '還元力・核酸供給経路機能',
  'Polyamine metabolism': 'ポリアミン代謝',
  'Purine metabolism': 'プリン・尿酸代謝機能',
  'Pyrimidine metabolism': '核酸合成（ピリミジン）代謝',
  'Redox balance / Glutathione': '酸化還元（抗酸化）バランス',
  'TCA Cycle': 'クエン酸回路',
  'Urea Cycle': 'アンモニア解毒（尿素回路）機能',
};


// ─── 言語別insightフィールド取得 ──────────
function insightField(ins, field) {
  if (!ins) return '';
  var lang = typeof currentLang !== 'undefined' ? currentLang : 'ja';
  if (lang !== 'ja') {
    var localized = ins[field + '_' + lang];
    if (localized) return localized;
  }
  return ins[field] || '';
}

function catJaName(cat) {
  if (!cat) return '';
  return (typeof catName === 'function') ? catName(cat) : (CAT_JA_CLINIC[cat.trim()] || cat);
}

let allPatients = [];
let selectedPatientId = null;
let selectedDate = null;

async function renderClinicPage(clinicId, status) {
  document.getElementById('clinic-avatar').textContent = clinicId.slice(0, 2);
  document.getElementById('clinic-name-display').textContent = currentUser.name || clinicId;

  try {
    // ADMINは全患者を取得
    if (clinicId === 'ADMIN' || status === 'admin') {
      allPatients = await fetchAllPatients();
      renderPatientList(allPatients);
    } else {
      allPatients = await fetchPatientsByClinic(clinicId);

      // trialかつ患者なしの場合はDEMOデータを表示
      if ((!status || status === 'trial') && !allPatients.length) {
        const demoPatients = await fetchPatientsByClinic('DEMO');
        if (demoPatients.length) {
          const mainScroll = document.getElementById('clinic-empty-state')?.parentElement;
          if (mainScroll) {
            const banner = document.createElement('div');
            banner.style.cssText = 'background:var(--amber-l);border:1px solid #f0c580;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--amber);display:flex;align-items:center;justify-content:space-between';
            banner.innerHTML = '<span>📊 ' + t('clinic.demoBanner') + '</span>' +
              '<a href="https://cpc-bank.com/collab/#contact" target="_blank" style="background:var(--amber);color:#fff;padding:4px 12px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:600;white-space:nowrap;margin-left:12px">' + t('clinic.contact') + '</a>';
            mainScroll.insertBefore(banner, mainScroll.firstChild);
          }
          allPatients = demoPatients;
          renderPatientList(allPatients);
        } else {
          document.getElementById('clinic-empty-state')?.classList.add('hidden');
          document.getElementById('clinic-trial-state')?.classList.remove('hidden');
          const trialIdEl = document.getElementById('clinic-trial-id');
          if (trialIdEl) trialIdEl.textContent = clinicId;
        }
        return;
      }

      renderPatientList(allPatients);
    }

  } catch(e) { console.error(e); }

  document.getElementById('clinic-search')?.addEventListener('input', function(e) {
    const q = e.target.value.toLowerCase();
    renderPatientList(allPatients.filter(function(p) { return p.id.toLowerCase().includes(q); }));
  });

  document.getElementById('btn-add-patient')?.addEventListener('click', function() { openModal('modal-add-patient'); });
}

function renderPatientList(patients) {
  const list = document.getElementById('clinic-patient-list');
  if (!list) return;
  if (!patients.length) {
    list.innerHTML = '<li style="padding:16px;color:var(--ink4);font-size:13px">患者がいません</li>';
    return;
  }
  list.innerHTML = patients.map(function(p) {
    return '<li class="patient-item ' + (p.id === selectedPatientId ? 'active' : '') + '" data-id="' + p.id + '" onclick="selectClinicPatient(\'' + p.id + '\')">' +
      '<div class="patient-item__dot">' + p.id.slice(-3) + '</div>' +
      '<div class="patient-item__info">' +
        '<div class="patient-item__id">' + p.id + '</div>' +
        '<div style="font-size:11px;color:var(--ink4)">' + ([p.sex, p.country].filter(Boolean).join(' / ') || '—') + '</div>' +
      '</div></li>';
  }).join('');
}

async function selectClinicPatient(patientId) {
  selectedPatientId = patientId;
  window._clinicPatientId = patientId;
  document.querySelectorAll('.patient-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.id === patientId);
  });

  document.getElementById('clinic-empty-state')?.classList.add('hidden');
  const detail = document.getElementById('clinic-detail');
  if (detail) detail.classList.remove('hidden');

  const patient = allPatients.find(function(p) { return p.id === patientId; });
  if (!patient) return;

  document.getElementById('clinic-detail-id').textContent = patient.id;
  document.getElementById('clinic-detail-name').textContent = patient.name || patient.id;

  const meta = [patient.sex, patient.country, patient.age ? patient.age + '歳' : '', patient.disease].filter(Boolean);
  document.getElementById('clinic-detail-meta').innerHTML =
    meta.map(function(m) { return '<span class="badge badge--green">' + m + '</span>'; }).join('') +
    '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
      '<button onclick="showKitSentModal(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:var(--foam);color:var(--emerald);border:1px solid var(--sage)">' + t('clinic.kitSent') + '</button>' +
      '<button onclick="releaseScores(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:var(--emerald);color:#fff;border:none">' + t('clinic.releaseScores') + '</button>' +
    '</div>';

  try {
    // この解析IDに紐付くメールから全解析IDを取得
    var allPatientIds = [patientId];
    try {
      const links = await dbSelect('user_analysis_ids', 'patient_id=eq.' + patientId + '&select=email&limit=1');
      if (links.length && links[0].email) {
        const email = links[0].email;
        const allLinks = await getAnalysisIdsByEmail(email);
        if (allLinks.length > 1) {
          allPatientIds = allLinks.map(function(l) { return l.patient_id; });
        }
      }
    } catch(e) { /* 紐付けなしの場合はスキップ */ }

    window._clinicAllIds = allPatientIds;

    // 全解析IDのスコアを統合取得
    var scores;
    if (allPatientIds.length > 1) {
      scores = await fetchScoresMulti(allPatientIds);
      // 複数IDがある場合は表示
      const idBadges = allPatientIds.map(function(id) {
        return '<span class="badge badge--green" style="font-family:var(--font-mono);font-size:10px">' + id + '</span>';
      }).join(' ');
      document.getElementById('clinic-detail-meta').innerHTML =
        meta.map(function(m) { return '<span class="badge badge--green">' + m + '</span>'; }).join('') +
        '<div style="margin-top:6px;font-size:11px;color:var(--ink4)">関連解析ID: ' + idBadges + '</div>';
    } else {
      scores = await fetchScores(patientId);
    }

    // 測定日一覧取得
    const datesSet = {};
    scores.forEach(function(s) { if (s.measured_at) datesSet[s.measured_at] = true; });
    const dates = Object.keys(datesSet).sort();
    selectedDate = dates[dates.length - 1] || null;

    renderDateTabs(dates, patientId);
    renderScoreOverview(scores.filter(function(s) { return s.measured_at === selectedDate; }));
    renderCatGrid(scores.filter(function(s) { return s.measured_at === selectedDate; }), patientId);
  } catch(e) { console.error(e); }
}

function renderDateTabs(dates, patientId) {
  const el = document.getElementById('clinic-date-tabs');
  if (!el) return;

  if (dates.length <= 1) {
    el.innerHTML = dates.length === 1
      ? '<span style="font-size:12px;color:var(--ink3);padding:6px 12px;background:var(--foam);border-radius:20px;border:1px solid var(--sage)">📅 ' + dates[0] + '</span>'
      : '';
    return;
  }

  el.innerHTML = '<span style="font-size:11px;color:var(--ink4);margin-right:8px">' + t('clinic.measureHistory') + '</span>' +
    dates.map(function(d) {
      return '<button class="date-tab ' + (d === selectedDate ? 'date-tab--active' : '') + '" onclick="switchDate(\'' + d + '\',\'' + patientId + '\')">' + d + '</button>';
    }).join('') +
    '<span style="margin-left:auto;font-size:11px;color:var(--ink4)">' + t('clinic.compare') + '</span>' +
    dates.map(function(d) {
      return '<button class="date-tab date-tab--compare" onclick="compareDate(\'' + d + '\')">' + d + '</button>';
    }).join('');
}

async function switchDate(date, patientId) {
  selectedDate = date;
  document.querySelectorAll('.date-tab:not(.date-tab--compare)').forEach(function(b) {
    b.classList.toggle('date-tab--active', b.textContent.trim() === date);
  });
  const scores = await fetchScores(patientId);
  const filtered = scores.filter(function(s) { return s.measured_at === date; });
  renderScoreOverview(filtered);
  renderCatGrid(filtered, patientId);
}

function renderScoreOverview(scores) {
  const el = document.getElementById('clinic-score-overview');
  if (!el) return;
  const rankCounts = { A:0, B:0, C:0, D:0, E:0 };
  scores.forEach(function(s) { if (s.rank) rankCounts[s.rank] = (rankCounts[s.rank]||0)+1; });
  const sorted = scores.slice().sort(function(a,b) { return (b.wavg_absfc||0)-(a.wavg_absfc||0); });
  const worst = sorted[0];

  el.innerHTML =
    '<div class="score-ov-card"><div class="score-ov-card__label">' + t('clinic.worst') + '</div><div style="font-size:14px;font-weight:600;color:var(--forest);margin-top:4px">' + (worst ? catJaName(worst.category) : '—') + '</div><div style="margin-top:6px"><span class="rank-badge rank-' + (worst ? worst.rank||'' : '') + '" style="width:32px;height:32px;font-size:16px">' + (worst ? worst.rank||'—' : '—') + '</span></div></div>';
}

function renderCatGrid(scores, patientId) {
  const el = document.getElementById('clinic-cat-grid');
  if (!el) return;

  el.innerHTML = scores.map(function(s) {
    const rank = s.rank || '—';
    return '<div class="cat-grid-card cat-grid-card--' + rank + '" onclick="selectClinicCat(this,\'' + patientId + '\',\'' + s.category.replace(/'/g, "\\'") + '\')">' +
      '<span class="cat-grid-card__name">' + (window.catJaName(s.category)) + '</span>' +
      '<span class="rank-badge rank-' + rank + '" style="width:24px;height:24px;font-size:12px;flex-shrink:0">' + rank + '</span>' +
    '</div>';
  }).join('');

  // 最初のカテゴリを自動選択
  if (scores.length) {
    const firstCard = el.querySelector('.cat-grid-card');
    if (firstCard) selectClinicCat(firstCard, patientId, scores[0].category);
  }
}

async function selectClinicCat(cardEl, patientId, category) {
  window._clinicCurrentCat = { patientId: patientId, category: category, cardEl: cardEl };
  document.querySelectorAll('.cat-grid-card').forEach(function(c) { c.classList.remove('active'); });
  if (cardEl) cardEl.classList.add('active');

  const detail = document.getElementById('clinic-cat-detail');
  if (!detail) return;
  detail.innerHTML = '<div style="color:var(--ink4);font-size:12px;padding:12px">' + t('clinic.loading') + '</div>';

  try {
    const scores = await fetchScores(patientId);
    const s = scores.find(function(x) { return x.category === category && x.measured_at === selectedDate; })
      || scores.find(function(x) { return x.category === category; });
    if (!s) return;

    const rank = s.rank || '—';
    const catJa = (window.CAT_JA && CAT_JA[category]) ? CAT_JA[category] : category;

    // category_resultsからmetabolitesタグ取得
    const crRows = await (async function() {
      try {
        const encoded = category.split('').map(function(c) {
          if (c === ' ') return '%20'; if (c === '/') return '%2F'; return c;
        }).join('');
        return await dbSelect('category_results', 'category=eq.' + encoded + '&select=id,metabolites&limit=1');
      } catch(e) { return []; }
    })();
    const cr = crRows[0];
    const metTags = cr && cr.metabolites ? cr.metabolites.split('、').map(function(m) {
      const dir = m.includes('↓') ? 'down' : m.includes('↑') ? 'up' : 'neutral';
      return '<span class="metabolite-tag ' + dir + '">' + m.trim() + '</span>';
    }).join('') : '';

    detail.innerHTML =
      '<div style="font-size:18px;font-weight:700;color:var(--forest);margin-bottom:4px;display:flex;align-items:center;gap:10px">' +
        '<span class="rank-badge rank-' + rank + '" style="width:36px;height:36px;font-size:18px">' + rank + '</span>' + catJa +
      '</div>' +
      (metTags ? '<div style="margin:12px 0"><div style="font-size:11px;color:var(--ink4);margin-bottom:6px">' + t('clinic.mainChange') + '</div><div style="display:flex;flex-wrap:wrap;gap:6px">' + metTags + '</div></div>' : '') +
      '<div style="display:flex;border-bottom:1px solid var(--border);margin:14px 0 16px">' +
        '<button class="pt-tab pt-tab--active" onclick="switchClinicTab(this,\'metabolite\')">' + t('clinic.tab.metabolite') + '</button>' +
        '<button class="pt-tab" onclick="switchClinicTab(this,\'clinical\')">' + t('clinic.tab.clinical') + '</button>' +
        '<button class="pt-tab" onclick="switchClinicTab(this,\'patient\')">' + t('clinic.tab.patient') + '</button>' +
      '</div>' +
      '<div id="clinic-tab-metabolite">' +
        '<div id="clinic-trend-chart" style="margin-bottom:12px"></div>' +
        '<div id="clinic-metabolite-table"><div style="color:var(--ink4);font-size:12px">読み込み中...</div></div>' +
      '</div>' +
      '<div id="clinic-tab-clinical" style="display:none"><div id="clinic-insights-clinical"></div></div>' +
      '<div id="clinic-tab-patient" style="display:none"><div id="clinic-insights-patient"></div></div>';

    // 代謝物テーブル・グラフ
    loadClinicMetaboliteData(patientId, category);

    // インサイト
    fetchInsightsByCategory(patientId, category).then(async function(ins) {
      const clinEl = document.getElementById('clinic-insights-clinical');
      const patEl = document.getElementById('clinic-insights-patient');

      if (clinEl) {
        if (!ins) {
          clinEl.innerHTML = '<div style="color:var(--ink4);font-size:13px;padding:12px">' + t('clinic.noData') + '</div>';
        } else {
          var parts = [];
          if (insightField(ins, 'interpretation')) parts.push('<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--ink4);margin-bottom:6px">' + t('clinic.interpretation') + '</div><div style="font-size:13px;color:var(--ink2);line-height:1.9;white-space:pre-wrap">' + insightField(ins, 'interpretation') + '</div></div>');
          if (insightField(ins, 'recommendation')) parts.push('<div><div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--ink4);margin-bottom:6px">' + t('clinic.intervention') + '</div><div style="font-size:13px;color:var(--ink2);line-height:1.9;white-space:pre-wrap">' + insightField(ins, 'recommendation') + '</div></div>');
          clinEl.innerHTML =
            '<div class="insight-box insight-box--blue">' +
              '<div class="insight-label">' + t('clinic.insightLabel') + '</div>' +
              (parts.length ? parts.join('') : '<div style="color:var(--ink4);font-size:13px">' + t('clinic.noData') + '</div>') +
            '</div>';
        }
      }

      if (patEl) {
        if (!ins || !insightField(ins, 'patient_comment')) {
          patEl.innerHTML = '<div style="color:var(--ink4);font-size:13px;padding:12px">' + t('clinic.noData') + '</div>';
        } else {
          patEl.innerHTML =
            '<div class="insight-box insight-box--amber">' +
              '<div class="insight-label">' + t('clinic.patientLabel') + '</div>' +
              '<div style="font-size:13px;color:var(--ink2);line-height:1.9;white-space:pre-wrap">' + insightField(ins, 'patient_comment') + '</div>' +
            '</div>';
        }
      }




































    });

  } catch(e) {
    const detail2 = document.getElementById('clinic-cat-detail');
    if (detail2) detail2.innerHTML = '<div style="color:var(--ink4);font-size:12px;padding:12px">' + t('clinic.error') + '</div>';
  }
}

function showFullInsight(encodedText) {
  const text = decodeURIComponent(encodedText);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:24px;max-width:680px;width:100%;max-height:80vh;overflow-y:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<div style="font-size:14px;font-weight:600;color:var(--forest)">📋 詳細データ</div>' +
        '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--ink4)">✕</button>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--ink2);line-height:1.9;white-space:pre-wrap">' + text + '</div>' +
    '</div>';
  document.body.appendChild(overlay);
}

function switchClinicTab(btn, tab) {
  document.querySelectorAll('#clinic-cat-detail .pt-tab').forEach(function(b) { b.classList.remove('pt-tab--active'); });
  btn.classList.add('pt-tab--active');
  ['metabolite','clinical','patient'].forEach(function(t) {
    const el = document.getElementById('clinic-tab-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
}

async function loadClinicMetaboliteData(patientId, category) {
  const chartEl = document.getElementById('clinic-trend-chart');
  const tableEl = document.getElementById('clinic-metabolite-table');

  try {
    const compounds = await dbSelect('compound_categories',
      'category=eq.' + encodeURIComponent(category) + '&select=compound,weight&order=weight.desc');
    if (!compounds.length) {
      if (tableEl) tableEl.innerHTML = '';
      if (chartEl) chartEl.innerHTML = '';
      return;
    }

    const compList = compounds.map(function(c) { return '"' + c.compound + '"'; }).join(',');

    // 複数解析IDがある場合は全IDのfactを取得
    var allIds = window._clinicAllIds || [patientId];
    var idFilter = allIds.map(function(id) { return '"' + id + '"'; }).join(',');
    const facts = await dbSelect('fact',
      'patient_id=in.(' + idFilter + ')&compound=in.(' + compList + ')&select=compound,sample_value,baseline,log2fc,measured_at,patient_id&order=measured_at.asc');

    // 測定日一覧
    var dates = [];
    facts.forEach(function(f) { if (f.measured_at && dates.indexOf(f.measured_at) === -1) dates.push(f.measured_at); });
    dates.sort();

    // グラフ描画
    if (chartEl) renderClinicChart(chartEl, facts, compounds, dates);

    // テーブル描画
    if (tableEl) renderClinicTable(tableEl, facts, compounds, dates);

  } catch(e) {
    if (tableEl) tableEl.innerHTML = '<div style="color:var(--ink4);font-size:12px">' + t('clinic.error') + '</div>';
  }
}

function renderClinicChart(el, facts, compounds, dates) {
  const factsWithLog2fc = facts.filter(function(f) { return f.log2fc != null; });
  if (!factsWithLog2fc.length) { el.innerHTML = ''; return; }

  const W = Math.max(el.offsetWidth || 600, 400);
  const H = 200;
  const padL = 52, padR = 20, padT = 24, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const log2fcs = factsWithLog2fc.map(function(f) { return Number(f.log2fc); });
  const maxV = Math.max(Math.abs(Math.max.apply(null, log2fcs)), Math.abs(Math.min.apply(null, log2fcs)), 1) * 1.2;

  var yAxis = '';
  var zeroY = padT + chartH / 2;
  yAxis += '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (W-padR) + '" y2="' + zeroY + '" stroke="#2D6A4F" stroke-width="1" stroke-dasharray="2,2"/>';
  [-2,-1,1,2].forEach(function(v) {
    if (Math.abs(v) > maxV) return;
    var y = padT + chartH/2 - (v/maxV)*(chartH/2);
    yAxis += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W-padR) + '" y2="' + y + '" stroke="#D4E6DD" stroke-width="1"/>';
    yAxis += '<text x="' + (padL-4) + '" y="' + (y+4) + '" text-anchor="end" font-size="9" fill="#8FAAA0">' + v + '</text>';
  });
  yAxis += '<text x="14" y="' + (padT+10) + '" text-anchor="middle" font-size="9" fill="#B03A2E" font-weight="bold">高い↑</text>';
  yAxis += '<text x="14" y="' + (padT+chartH-4) + '" text-anchor="middle" font-size="9" fill="#4A90D9" font-weight="bold">低い↓</text>';

  var xLabels = '';
  dates.forEach(function(d, i) {
    var x = dates.length === 1 ? padL+chartW/2 : padL+(chartW/(dates.length-1))*i;
    xLabels += '<text x="' + x + '" y="' + (H-6) + '" text-anchor="middle" font-size="9" fill="#8FAAA0">' + d.slice(0,10) + '</text>';
    xLabels += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (padT+chartH) + '" stroke="#D4E6DD" stroke-width="1"/>';
  });
  xLabels += '<text x="' + (padL+chartW/2) + '" y="' + (H-22) + '" text-anchor="middle" font-size="9" fill="#8FAAA0">' + t('clinic.measureDate') + '</text>';

  var compoundsWithData = compounds.filter(function(c) {
    return facts.some(function(f) { return f.compound === c.compound && f.log2fc != null; });
  }).slice(0, 8);

  var dots = '';
  compoundsWithData.forEach(function(c) {
    var compFacts = facts.filter(function(f) { return f.compound === c.compound && f.log2fc != null; });
    compFacts.forEach(function(f) {
      var di = dates.indexOf(f.measured_at);
      if (di === -1) return;
      var x = dates.length === 1 ? padL+chartW/2 : padL+(chartW/(dates.length-1))*di;
      var y = padT + chartH/2 - (Number(f.log2fc)/maxV)*(chartH/2);
      var color = Number(f.log2fc) >= 0 ? '#B03A2E' : '#4A90D9';
      var tipText = c.compound + ' | 実測値:' + (f.sample_value != null ? Number(f.sample_value).toFixed(2) : '—') + ' | 基準値:' + (f.baseline != null ? Number(f.baseline).toFixed(2) : '—') + ' | log2FC:' + Number(f.log2fc).toFixed(3);
        dots += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + color + '" stroke="#fff" stroke-width="1.5" opacity="0.85"' +
          ' onmouseover="showChartTooltip(event,\'' + tipText.replace(/'/g, '') + '\')"' +
          ' onmouseout="hideChartTooltip()"/>';
    });
  });

  el.innerHTML = '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="overflow:visible;display:block">' + yAxis + xLabels + dots + '</svg>';
}

function renderClinicTable(el, facts, compounds, dates) {
  var factMap = {};
  facts.forEach(function(f) {
    if (!factMap[f.compound]) factMap[f.compound] = {};
    factMap[f.compound][f.measured_at] = f;
  });

  var thDates = dates.map(function(d) {
    return '<th>実測値 (' + d.slice(0,10).replace(/-/g,'/') + ')</th>';
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
      cells += '<td style="font-family:var(--font-mono)">' + (val != null ? val.toFixed(2) : '—') + '</td>';
      prevVal = val;
    });

    var lastF = factMap[c.compound] && dates.length > 0 ? factMap[c.compound][dates[dates.length-1]] : null;
    var prevF = factMap[c.compound] && dates.length > 1 ? factMap[c.compound][dates[dates.length-2]] : null;
    var prevCompare = '—';
    if (lastF && prevF && lastF.sample_value != null && prevF.sample_value != null) {
      var diff = Number(lastF.sample_value) - Number(prevF.sample_value);
      var sign = diff > 0 ? '+' : '';
      prevCompare = '<span style="color:' + (diff > 0 ? '#B03A2E' : '#2D6A4F') + '">' + sign + diff.toFixed(2) + '</span>';
    }

    rows += '<tr><td>' + c.compound + '</td>' +
      '<td><span class="rank-badge" style="background:var(--emerald);color:#fff;font-size:11px">' + c.weight + '</span></td>' +
      '<td style="font-family:var(--font-mono);color:var(--ink4)">' + baseline + '</td>' +
      cells +
      '<td>' + prevCompare + '</td></tr>';
  });

  el.innerHTML = '<table class="score-table" style="width:100%;margin-top:4px">' +
    '<thead><tr><th>代謝物</th><th>重要度</th><th>基準値</th>' + thDates + '<th>前回比</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table>';
}

// ─── 発送連絡モーダル ────────────────────
function showKitSentModal(patientId) {
  const today = new Date().toISOString().slice(0,10);
  const overlay = document.createElement('div');
  overlay.id = 'kit-sent-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:28px;width:380px;box-shadow:0 8px 32px rgba(0,0,0,.2)">' +
      '<div style="font-size:16px;font-weight:600;color:var(--forest);margin-bottom:20px">' + t('clinic.kitSentTitle') + '</div>' +
      '<div style="font-size:12px;color:var(--ink4);margin-bottom:6px;letter-spacing:1px;text-transform:uppercase">' + t('clinic.analysisId') + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:14px;color:var(--forest);margin-bottom:16px;padding:10px;background:var(--foam);border-radius:8px">' + patientId + '</div>' +
      '<div style="font-size:12px;color:var(--ink4);margin-bottom:6px;letter-spacing:1px;text-transform:uppercase">' + t('clinic.sentDate') + '</div>' +
      '<input type="date" id="kit-sent-date" value="' + today + '" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;margin-bottom:20px;outline:none">' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button onclick="document.getElementById(\'kit-sent-modal\').remove()" style="padding:9px 20px;border-radius:8px;font-size:13px;background:var(--foam);color:var(--emerald);border:1px solid var(--sage);cursor:pointer;font-family:inherit">キャンセル</button>' +
        '<button onclick="submitKitSent(\'' + patientId + '\')" style="padding:9px 20px;border-radius:8px;font-size:13px;background:var(--emerald);color:#fff;border:none;cursor:pointer;font-family:inherit;font-weight:500">送信</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
}

async function submitKitSent(patientId) {
  const kitSentAt = document.getElementById('kit-sent-date').value;
  if (!kitSentAt) return;

  try {
    // patients.kit_sent_atを更新
    await fetch(SUPABASE_URL + '/rest/v1/patients?id=eq.' + patientId, {
      method: 'PATCH',
      headers: Object.assign({}, HEADERS, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify({ kit_sent_at: kitSentAt })
    });

    document.getElementById('kit-sent-modal').remove();
    if (typeof showToast === 'function') showToast(t('clinic.kitSentToast'), 'success');
  } catch(e) {
    if (typeof showToast === 'function') showToast(t('clinic.errorToast'), 'error');
  }
}

// ─── 結果公開 ────────────────────────────
async function releaseScores(patientId) {
  if (!confirm(t('clinic.releaseConfirm'))) return;

  try {
    // 全解析IDのスコアをis_released = trueに更新
    const allIds = window._clinicAllIds || [patientId];
    for (var i = 0; i < allIds.length; i++) {
      await fetch(SUPABASE_URL + '/rest/v1/scores?patient_id=eq.' + allIds[i], {
        method: 'PATCH',
        headers: Object.assign({}, HEADERS, { 'Prefer': 'return=minimal' }),
        body: JSON.stringify({ is_released: true })
      });
    }
    if (typeof showToast === 'function') showToast(t('clinic.releaseToast'), 'success');
  } catch(e) {
    if (typeof showToast === 'function') showToast(t('clinic.errorToast'), 'error');
  }
}

