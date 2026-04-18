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
          // empty/trial-stateを非表示
          document.getElementById('clinic-empty-state')?.classList.add('hidden');
          document.getElementById('clinic-trial-state')?.classList.add('hidden');
          // デモバナーをmain-scrollの先頭に追加
          const mainScroll = document.querySelector('.clinic-main-scroll');
          if (mainScroll && !document.getElementById('demo-banner')) {
            const banner = document.createElement('div');
            banner.id = 'demo-banner';
            banner.style.cssText = 'background:var(--amber-l);border:1px solid #f0c580;border-radius:10px;padding:16px 20px;margin-bottom:16px;font-size:13px;color:var(--amber)';
            banner.innerHTML =
              '<div style="font-weight:600;margin-bottom:6px">📊 ' + t('clinic.demoBanner') + '</div>' +
              '<div style="font-size:12px;color:var(--ink3);margin-bottom:12px">' + t('clinic.demoSub') + '</div>' +
              '<a href="https://cpc-bank.com/collab/#contact" target="_blank" style="background:var(--amber);color:#fff;padding:8px 20px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;display:inline-block">' +
              '📩 ' + t('clinic.contact') + '</a>' +
              '<div style="font-size:11px;color:var(--ink4);margin-top:10px">クリニックID: <span style="font-family:monospace">' + clinicId + '</span></div>';
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
      '<button onclick="unreleaseScores(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:var(--foam);color:var(--ink3);border:1px solid var(--border)">' + t('clinic.unrelease') + '</button>' +
    '</div>';

  try {
    // この解析IDに紐付くメールから全解析IDを取得
    // クリニック側では常に選択した患者IDのみ表示（user_analysis_idsは参照しない）
    var allPatientIds = [patientId];

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
    const catJa = (typeof catName === 'function') ? catName(category) : ((window.CAT_JA && CAT_JA[category]) ? CAT_JA[category] : category);

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

    var catDescText = (typeof CAT_DESC !== 'undefined' && CAT_DESC[currentLang] && CAT_DESC[currentLang][category]) || '';

    detail.innerHTML =
      '<div style="font-size:18px;font-weight:700;color:var(--forest);margin-bottom:4px;display:flex;align-items:center;gap:10px">' +
        '<span class="rank-badge rank-' + rank + '" style="width:36px;height:36px;font-size:18px">' + rank + '</span>' + catJa +
      '</div>' +
      (catDescText ? '<div style="margin:10px 0;padding:10px 14px;background:var(--foam);border-left:3px solid var(--sage);border-radius:0 8px 8px 0;font-size:12px;color:var(--ink2);line-height:1.7">' + catDescText + '</div>' : '') +
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
  yAxis += '<text x="14" y="' + (padT+10) + '" text-anchor="middle" font-size="9" fill="#B03A2E" font-weight="bold">'+t('clinic.highUp')+'</text>';
  yAxis += '<text x="14" y="' + (padT+chartH-4) + '" text-anchor="middle" font-size="9" fill="#4A90D9" font-weight="bold">'+t('clinic.lowDown')+'</text>';

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
      var tipText = c.compound + ' | ' + t('patient.measured') + ':' + (f.sample_value != null ? Number(f.sample_value).toFixed(2) : '—') + ' | ' + t('patient.baseline') + ':' + (f.baseline != null ? Number(f.baseline).toFixed(2) : '—') + ' | log2FC:' + Number(f.log2fc).toFixed(3);
        dots += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + color + '" stroke="#fff" stroke-width="1.5" opacity="0.85" style="cursor:pointer"' +
          ' onmouseover="showChartTooltip(event,this.dataset.tip)" onmouseout="hideChartTooltip()"' +
          ' data-tip="' + tipText.replace(/"/g, '&quot;') + '"/>';
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

  var lastDate = dates[dates.length - 1];

  // log2fc降順でソート（↑が上、↓が下）。log2fcなしは末尾
  var sorted = compounds.slice().sort(function(a, b) {
    var fa = factMap[a.compound] && factMap[a.compound][lastDate];
    var fb = factMap[b.compound] && factMap[b.compound][lastDate];
    var la = fa && fa.log2fc != null ? Number(fa.log2fc) : null;
    var lb = fb && fb.log2fc != null ? Number(fb.log2fc) : null;
    if (la === null && lb === null) return 0;
    if (la === null) return 1;
    if (lb === null) return -1;
    return lb - la;
  });

  var thDates = dates.map(function(d) {
    return '<th>' + t('patient.measured') + ' (' + d.slice(0,10).replace(/-/g,'/') + ')</th>';
  }).join('');

  var rows = '';
  sorted.forEach(function(c) {
    var baseline = '—';
    var cells = '';

    dates.forEach(function(d) {
      var f = factMap[c.compound] && factMap[c.compound][d];
      var val = f && f.sample_value != null ? Number(f.sample_value) : null;
      var bl = f && f.baseline != null ? Number(f.baseline) : null;
      if (bl != null && baseline === '—') baseline = bl.toFixed(2);

      // 差分表示（実測値 - 基準値）
      var diffHtml = '';
      if (val != null && bl != null && bl > 0) {
        var diff = val - bl;
        var sign = diff >= 0 ? '+' : '';
        var color = diff >= 0 ? '#B03A2E' : '#2563EB';
        diffHtml = ' <span style="color:' + color + ';font-size:10px;font-weight:600">(' + sign + diff.toFixed(1) + ')</span>';
      }
      cells += '<td style="font-family:var(--font-mono)">' + (val != null ? val.toFixed(2) : '—') + diffHtml + '</td>';
    });

    // log2fcで方向を判定
    var lastF = factMap[c.compound] && factMap[c.compound][lastDate];
    var log2fc = lastF && lastF.log2fc != null ? Number(lastF.log2fc) : null;
    var dirColor = log2fc != null ? (log2fc >= 0 ? '#B03A2E' : '#2563EB') : 'var(--ink4)';
    var dirSymbol = log2fc != null ? (log2fc >= 0 ? '↑' : '↓') : '';

    rows += '<tr>' +
      '<td><span style="color:' + dirColor + ';font-weight:600;margin-right:4px">' + dirSymbol + '</span>' + c.compound + '</td>' +
      '<td style="text-align:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:4px;background:var(--emerald);color:#fff;font-size:10px;font-weight:700;font-family:var(--font-mono)">' + c.weight + '</span></td>' +
      '<td style="font-family:var(--font-mono);color:var(--ink4)">' + baseline + '</td>' +
      cells + '</tr>';
  });

  el.innerHTML = '<div class="table-scroll-wrap"><table class="score-table" style="min-width:480px;margin-top:4px">' +
    '<thead><tr><th>' + t('patient.compound') + '</th><th>' + t('patient.weight') + '</th><th>' + t('patient.baseline') + '</th>' + thDates + '</tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
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
async function unreleaseScores(patientId) {
  if (!confirm(t('clinic.unreleaseConfirm'))) return;
  try {
    const allIds = window._clinicAllIds || [patientId];
    for (var i = 0; i < allIds.length; i++) {
      await fetch(SUPABASE_URL + '/rest/v1/scores?patient_id=eq.' + allIds[i], {
        method: 'PATCH',
        headers: Object.assign({}, HEADERS, { 'Prefer': 'return=minimal' }),
        body: JSON.stringify({ is_released: false })
      });
    }
    if (typeof showToast === 'function') showToast(t('clinic.unreleaseToast'), 'success');
  } catch(e) {
    if (typeof showToast === 'function') showToast(t('clinic.errorToast'), 'error');
  }
}

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

// ═══════════════════════════════════════════════════════════
//  患者追加・取得機能（clinic.jsに追加する部分）
// ═══════════════════════════════════════════════════════════

// ─── 患者追加（新規解析ID発行） ──────────────────────────

async function insertPatient(data) {
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/patients', {
      method: 'POST',
      headers: Object.assign({}, HEADERS, {
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }),
      body: JSON.stringify({
        id: data.id,
        clinic_id: data.clinic_id,
        status: data.status || 'pending',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Insert failed');
    }

    console.log('✓ Patient inserted:', data.id);
    return { id: data.id };
  } catch (e) {
    console.error('insertPatient error:', e);
    throw e;
  }
}

// ─── クリニック別患者取得 ────────────────────────────────

async function fetchPatientsByClinic(clinicId) {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/patients?clinic_id=eq.' + encodeURIComponent(clinicId) + '&order=created_at.desc',
      {
        method: 'GET',
        headers: HEADERS
      }
    );

    if (!response.ok) {
      throw new Error('Fetch failed: ' + response.statusText);
    }

    const data = await response.json();
    console.log('✓ Fetched patients for clinic', clinicId, ':', (data || []).length);
    return data || [];
  } catch (e) {
    console.error('fetchPatientsByClinic error:', e);
    throw e;
  }
}

// ─── 全患者取得（ADMIN用） ────────────────────────────────

async function fetchAllPatients() {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/patients?order=created_at.desc',
      {
        method: 'GET',
        headers: HEADERS
      }
    );

    if (!response.ok) {
      throw new Error('Fetch failed: ' + response.statusText);
    }

    const data = await response.json();
    console.log('✓ Fetched all patients:', (data || []).length);
    return data || [];
  } catch (e) {
    console.error('fetchAllPatients error:', e);
    throw e;
  }
}

// ─── スコア取得（複数ID） ────────────────────────────────

async function fetchScoresMulti(patientIds) {
  try {
    const ids = patientIds.map(id => "'" + id.replace(/'/g, "''") + "'").join(',');
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/scores?patient_id=in.(' + encodeURIComponent(ids) + ')',
      {
        method: 'GET',
        headers: HEADERS
      }
    );

    if (!response.ok) {
      throw new Error('Fetch failed');
    }

    return await response.json();
  } catch (e) {
    console.error('fetchScoresMulti error:', e);
    return [];
  }
}

// ─── スコア取得（単一ID） ────────────────────────────────

async function fetchScoresForPatient(patientId) {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/scores?patient_id=eq.' + encodeURIComponent(patientId) + '&order=category.asc',
      {
        method: 'GET',
        headers: HEADERS
      }
    );

    if (!response.ok) {
      throw new Error('Fetch failed');
    }

    return await response.json();
  } catch (e) {
    console.error('fetchScoresForPatient error:', e);
    return [];
  }
}

// ─── Compound データ取得 ──────────────────────────────────

async function fetchCompoundFactsForPatient(patientId) {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/compound_facts?patient_id=eq.' + encodeURIComponent(patientId),
      {
        method: 'GET',
        headers: HEADERS
      }
    );

    if (!response.ok) {
      throw new Error('Fetch failed');
    }

    return await response.json();
  } catch (e) {
    console.error('fetchCompoundFactsForPatient error:', e);
    return [];
  }
}
