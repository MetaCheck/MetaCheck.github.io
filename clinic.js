// ═══════════════════════════════════════════
//  clinic.js — クリニックポータル
// ═══════════════════════════════════════════

// ─── 解析IDから日付を算出（先頭6桁: YYMMDD）────
function dateFromPatientId(patientId) {
  if (!patientId || patientId.length < 6) return '';
  var yy = patientId.slice(0, 2);
  var mm = patientId.slice(2, 4);
  var dd = patientId.slice(4, 6);
  return '20' + yy + '-' + mm + '-' + dd;
}

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
    // 毎回 Supabase から最新データを取得
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
  
  // IDの先頭6桁（YYMMDD）で新しい順にソート
  const sorted = (patients || []).slice().sort(function(a, b) {
    return b.id.localeCompare(a.id);
  });
  
  list.innerHTML = sorted.map(function(p) {
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

  // メモを読み込む
  var memoEl = document.getElementById('clinic-memo');
  if (memoEl) {
    memoEl.value = patient.clinic_memo || '';
  }

  const meta = [patient.sex, patient.country, patient.age ? patient.age + '歳' : '', patient.disease].filter(Boolean);
  document.getElementById('clinic-detail-meta').innerHTML =
    meta.map(function(m) { return '<span class="badge badge--green">' + m + '</span>'; }).join('') +
    '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
      '<button onclick="showKitSentModal(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:var(--foam);color:var(--emerald);border:1px solid var(--sage)">' + t('clinic.kitSent') + '</button>' +
      '<button onclick="releaseScores(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:var(--emerald);color:#fff;border:none">' + t('clinic.releaseScores') + '</button>' +
      '<button onclick="unreleaseScores(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:var(--foam);color:var(--ink3);border:1px solid var(--border)">' + t('clinic.unrelease') + '</button>' +
      '<button onclick="confirmDeletePatient(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:#fdecea;color:#B03A2E;border:1px solid #f4c7c3">' + t('clinic.delete') + '</button>' +
    '</div>';

  try {
    // メールアドレスから同じ患者の全解析IDを取得
    var allPatientIds = [patientId];
    try {
      var links = await dbSelect('user_analysis_ids', 'patient_id=eq.' + encodeURIComponent(patientId) + '&select=email&limit=1');
      if (links.length && links[0].email) {
        var allLinks = await getAnalysisIdsByEmail(links[0].email);
        if (allLinks.length > 1) {
          allPatientIds = allLinks.map(function(l) { return l.patient_id; });
        }
      }
    } catch(e2) { /* 紐付けなし */ }

    window._clinicAllIds = allPatientIds;

    // 全解析IDのスコアを統合取得
    var scores;
    if (allPatientIds.length > 1) {
      scores = await fetchScoresMulti(allPatientIds);
      const idBadges = allPatientIds.map(function(id) {
        return '<span class="badge badge--green" style="font-family:var(--font-mono);font-size:10px">' + id + '</span>';
      }).join(' ');
      document.getElementById('clinic-detail-meta').innerHTML =
        meta.map(function(m) { return '<span class="badge badge--green">' + m + '</span>'; }).join('') +
        '<div style="margin-top:6px;font-size:11px;color:var(--ink4)">関連解析ID: ' + idBadges + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
          '<button onclick="showKitSentModal(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:var(--foam);color:var(--emerald);border:1px solid var(--sage)">' + t('clinic.kitSent') + '</button>' +
          '<button onclick="releaseScores(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:var(--emerald);color:#fff;border:none">' + t('clinic.releaseScores') + '</button>' +
          '<button onclick="unreleaseScores(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:var(--foam);color:var(--ink3);border:1px solid var(--border)">' + t('clinic.unrelease') + '</button>' +
          '<button onclick="confirmDeletePatient(\'' + patientId + '\')" style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:\'DM Sans\',sans-serif;background:#fdecea;color:#B03A2E;border:1px solid #f4c7c3">' + t('clinic.delete') + '</button>' +
        '</div>';
    } else {
      scores = await fetchScores(patientId);
    }

    // 測定日一覧取得
    const datesSet = {};
    scores.forEach(function(s) { var d = dateFromPatientId(s.patient_id); if (d) datesSet[d] = true; });
    const dates = Object.keys(datesSet).sort();
    selectedDate = dates[dates.length - 1] || null;

    renderDateTabs(dates, patientId);
    renderScoreOverview(scores.filter(function(s) { return dateFromPatientId(s.patient_id) === selectedDate; }));
    renderCatGrid(scores.filter(function(s) { return dateFromPatientId(s.patient_id) === selectedDate; }), patientId);
    if (allPatientIds.length > 1) { renderClinicScoreTrend(allPatientIds, scores); }

    // パスウェイモードが表示中なら、選び直した患者のデータで再描画
    var pathwayView = document.getElementById('clinic-view-pathway');
    if (pathwayView && !pathwayView.classList.contains('hidden')) {
      renderPathwayMode(patientId, selectedDate);
    }
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
  const filtered = scores.filter(function(s) { return dateFromPatientId(s.patient_id) === date; });
  renderScoreOverview(filtered);
  renderCatGrid(filtered, patientId);

  var pathwayView = document.getElementById('clinic-view-pathway');
  if (pathwayView && !pathwayView.classList.contains('hidden')) {
    renderPathwayMode(patientId, date);
  }
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
    const s = scores.find(function(x) { return x.category === category && dateFromPatientId(x.patient_id) === selectedDate; })
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
    alert('DEBUG 1: insertPatient called with: ' + data.id);
    
    if (typeof SUPABASE_URL === 'undefined') {
      throw new Error('SUPABASE_URL is not defined');
    }
    alert('DEBUG 2: SUPABASE_URL = ' + SUPABASE_URL);
    
    if (typeof HEADERS === 'undefined') {
      throw new Error('HEADERS is not defined');
    }
    alert('DEBUG 3: HEADERS defined');
    
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

    alert('DEBUG 4: Response status = ' + response.status);

    if (!response.ok) {
      const err = await response.json();
      alert('DEBUG 5: Response error = ' + JSON.stringify(err));
      throw new Error(err.message || 'Insert failed');
    }

    alert('DEBUG 6: Patient inserted successfully: ' + data.id);
    console.log('✓ Patient inserted:', data.id);
    return { id: data.id };
  } catch (e) {
    alert('DEBUG ERROR: ' + e.message);
    console.error('insertPatient error:', e);
    throw e;
  }
}

// ─── クリニック別患者取得 ────────────────────────────────

async function fetchPatientsByClinic(clinicId) {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/patients?clinic_id=eq.' + encodeURIComponent(clinicId) + '&order=id.desc',
      {
        method: 'GET',
        headers: HEADERS
      }
    );

    if (!response.ok) {
      throw new Error('Fetch failed: ' + response.statusText);
    }

    const data = await response.json();
    // クライアント側で deleted を除外
    const filtered = (data || []).filter(function(p) { return p.status !== 'deleted'; });
    console.log('✓ Fetched patients for clinic', clinicId, ':', filtered.length);
    return filtered;
  } catch (e) {
    console.error('fetchPatientsByClinic error:', e);
    throw e;
  }
}

// ─── 全患者取得（ADMIN用） ────────────────────────────────

async function fetchAllPatients() {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/patients?order=id.desc',
      {
        method: 'GET',
        headers: HEADERS
      }
    );

    if (!response.ok) {
      throw new Error('Fetch failed: ' + response.statusText);
    }

    const data = await response.json();
    // クライアント側で deleted を除外
    const filtered = (data || []).filter(function(p) { return p.status !== 'deleted'; });
    console.log('✓ Fetched all patients:', filtered.length);
    return filtered;
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

// ─── 患者削除（論理削除） ────────────────────────────────

async function deletePatient(patientId) {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/patients?id=eq.' + encodeURIComponent(patientId),
      {
        method: 'PATCH',
        headers: Object.assign({}, HEADERS, {
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }),
        body: JSON.stringify({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!response.ok) {
      throw new Error('Delete failed: ' + response.statusText);
    }

    console.log('✓ Patient marked as deleted:', patientId);
    return true;
  } catch (e) {
    console.error('deletePatient error:', e);
    throw e;
  }
}

// ─── 患者削除確認 ────────────────────────────────────

async function confirmDeletePatient(patientId) {
  var lang = typeof currentLang !== 'undefined' ? currentLang : 'ja';
  var confirmMsg = {
    'ja': '患者 ' + patientId + ' を削除してもよろしいですか？\n※ データは保存され、復旧可能です',
    'en': 'Delete patient ' + patientId + '?\n※ Data will be retained and can be recovered.',
    'vi': 'Xóa bệnh nhân ' + patientId + ' không?\n※ Dữ liệu sẽ được lưu giữ và có thể khôi phục.'
  };
  
  if (!confirm(confirmMsg[lang] || confirmMsg['ja'])) {
    return;
  }

  try {
    await deletePatient(patientId);
    
    // 一覧をリロード
    allPatients = await fetchPatientsByClinic(currentUser.clinicId);
    allPatients = (allPatients || []).sort((a, b) => a.id.localeCompare(b.id));
    renderPatientList(allPatients);
    
    // 詳細パネルを非表示
    const detail = document.getElementById('clinic-detail');
    if (detail) detail.classList.add('hidden');
    const emptyState = document.getElementById('clinic-empty-state');
    if (emptyState) emptyState.classList.remove('hidden');
    
    if (typeof showToast === 'function') showToast(t('clinic.deleteSuccess'), 'success');
  } catch (e) {
    if (typeof showToast === 'function') showToast(t('clinic.deleteFailed'), 'error');
    console.error(e);
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

// ─── クリニック用スコア推移グラフ ──────────────
function renderClinicScoreTrend(patientIds, allScores) {
  var container = document.getElementById('clinic-score-trend');
  if (!container) {
    var overview = document.querySelector('.score-ov-card');
    if (!overview) return;
    container = document.createElement('div');
    container.id = 'clinic-score-trend';
    container.style.cssText = 'margin-bottom:16px';
    overview.parentNode.insertBefore(container, overview);
  }

  if (!allScores || !allScores.length) { container.innerHTML = ''; return; }

  var dates = [];
  allScores.forEach(function(s) {
    var d = dateFromPatientId(s.patient_id);
    if (d && dates.indexOf(d) === -1) dates.push(d);
  });
  dates.sort();
  if (dates.length < 2) { container.innerHTML = ''; return; }

  var categories = [];
  allScores.forEach(function(s) {
    if (s.category && categories.indexOf(s.category) === -1) categories.push(s.category);
  });

  var scoreMap = {};
  allScores.forEach(function(s) {
    var d = dateFromPatientId(s.patient_id);
    if (!scoreMap[s.category]) scoreMap[s.category] = {};
    scoreMap[s.category][d] = { wavg: s.wavg, rank: s.rank };
  });

  var colors = [
    '#2D6A4F','#52B788','#95D5B2','#1B4332','#40916C',
    '#74C69D','#B7E4C7','#4A90D9','#E9C46A','#F4A261',
    '#E76F51','#9B2226','#AE2012','#BB3E03','#CA6702','#8FAAA0'
  ];

  var W = Math.max(container.offsetWidth || 400, 300);
  var H = 240;
  var padL = 10, padR = 10, padT = 20, padB = 60;
  var chartW = W - padL - padR;
  var chartH = H - padT - padB;
  var barGroupW = chartW / dates.length;
  var barW = Math.max(Math.min(barGroupW / categories.length * 0.7, 16), 4);

  var maxWavg = 1;
  allScores.forEach(function(s) { if (s.wavg != null && Number(s.wavg) > maxWavg) maxWavg = Number(s.wavg); });

  var bars = '', lines = '';

  categories.forEach(function(cat, ci) {
    var color = colors[ci % colors.length];
    var prevX = null, prevY = null;

    dates.forEach(function(d, di) {
      var sc = scoreMap[cat] && scoreMap[cat][d];
      if (!sc || sc.wavg == null) return;
      var wavg = Number(sc.wavg);
      var groupCenterX = padL + (di + 0.5) * barGroupW;
      var barX = groupCenterX - (categories.length * barW / 2) + ci * barW;
      var barH2 = (wavg / maxWavg) * chartH;
      var barY = padT + chartH - barH2;
      var tip = catJaName(cat) + ' | ' + d + ' | wavg:' + wavg.toFixed(3) + ' | ' + (sc.rank || '');

      bars += '<rect x="' + barX + '" y="' + barY + '" width="' + (barW - 1) + '" height="' + barH2 + '"' +
        ' fill="' + color + '" opacity="0.85" rx="1" data-tip="' + tip.replace(/"/g,'&quot;') + '"' +
        ' style="cursor:pointer" onmouseover="showChartTooltip(event,this.dataset.tip)" onmouseout="hideChartTooltip()"/>';

      var cx = barX + barW / 2;
      var cy = barY;
      if (prevX !== null) {
        lines += '<line x1="' + prevX + '" y1="' + prevY + '" x2="' + cx + '" y2="' + cy + '"' +
          ' stroke="' + color + '" stroke-width="1.5" opacity="0.7"/>';
      }
      prevX = cx; prevY = cy;
    });
  });

  var xLabels = '';
  dates.forEach(function(d, di) {
    var x = padL + (di + 0.5) * barGroupW;
    xLabels += '<text x="' + x + '" y="' + (H - 42) + '" text-anchor="middle" font-size="9" fill="#8FAAA0">' + d.slice(2).replace(/-/g,'/') + '</text>';
    xLabels += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (padT + chartH) + '" stroke="#D4E6DD" stroke-width="1"/>';
  });

  var baseline = '<line x1="' + padL + '" y1="' + (padT + chartH) + '" x2="' + (W - padR) + '" y2="' + (padT + chartH) + '" stroke="#D4E6DD" stroke-width="1"/>';

  container.innerHTML =
    '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);margin-bottom:8px">スコア推移</div>' +
    '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--r);padding:12px;overflow-x:auto">' +
      '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="overflow:visible;display:block;min-width:300px">' +
        baseline + xLabels + bars + lines +
      '</svg>' +
    '</div>';
}

// ── メモ保存 ──
(function() {
  var memoTimer = null;
  document.addEventListener('DOMContentLoaded', function() {
    var memoEl = document.getElementById('clinic-memo');
    if (!memoEl) return;
    memoEl.addEventListener('input', function() {
      clearTimeout(memoTimer);
      memoTimer = setTimeout(function() { saveClinicMemo(); }, 1000);
    });
    memoEl.addEventListener('blur', function() {
      clearTimeout(memoTimer);
      saveClinicMemo();
    });
  });
})();

async function saveClinicMemo() {
  var patientId = window._clinicPatientId;
  if (!patientId) return;
  var memoEl = document.getElementById('clinic-memo');
  if (!memoEl) return;
  var memo = memoEl.value;
  try {
    var res = await fetch(SUPABASE_URL + '/rest/v1/patients?id=eq.' + patientId, {
      method: 'PATCH',
      headers: Object.assign({}, HEADERS, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify({ clinic_memo: memo })
    });
    if (res.ok) {
      var savedEl = document.getElementById('memo-saved');
      if (savedEl) {
        savedEl.classList.remove('hidden');
        savedEl.classList.add('show');
        setTimeout(function() { savedEl.classList.remove('show'); }, 2000);
      }
      // allPatientsのキャッシュも更新
      var p = allPatients && allPatients.find(function(x) { return x.id === patientId; });
      if (p) p.clinic_memo = memo;
    }
  } catch(e) { console.error('メモ保存失敗', e); }
}


// ═══════════════════════════════════════════
//  パスウェイモード
// ═══════════════════════════════════════════

let _pathwayCoords = null;
let _pathwayClinicalDb = null;
let _pathwayEdges = null;
let _pathwayCurrentPatientId = null;
let _pathwayCurrentDate = null;

const PATHWAY_ALIAS = {
  '2-Oxoglutarate': 'aKG',
  'Succinyl CoA': 'SUC CoA',
  'Citrate+Isocitrate': 'Citrate',
  'cis-Aconitate': 'cis ACO',
};

async function loadPathwayAssets() {
  if (_pathwayCoords && _pathwayClinicalDb && _pathwayEdges) return;
  const [coords, clinicalDb, edges] = await Promise.all([
    fetch('/pathway_coordinates.json').then(function(r) { return r.json(); }),
    fetch('/pathway_clinical_db.json').then(function(r) { return r.json(); }),
    fetch('/pathway_edges.json').then(function(r) { return r.json(); }),
  ]);
  _pathwayCoords = coords;
  _pathwayClinicalDb = clinicalDb;
  _pathwayEdges = edges;
}

function switchClinicView(view) {
  document.getElementById('view-tab-score').classList.toggle('view-tab--active', view === 'score');
  document.getElementById('view-tab-pathway').classList.toggle('view-tab--active', view === 'pathway');
  document.getElementById('clinic-view-score').classList.toggle('hidden', view !== 'score');
  document.getElementById('clinic-view-pathway').classList.toggle('hidden', view !== 'pathway');

  if (view === 'pathway' && selectedPatientId) {
    renderPathwayMode(selectedPatientId, selectedDate);
  }
}

async function renderPathwayMode(patientId, date) {
  _pathwayCurrentPatientId = patientId;
  _pathwayCurrentDate = date;

  await loadPathwayAssets();

  const img = document.getElementById('pathway-img');

  // この患者のfactデータ(baseline・log2fc含む)を取得
  let facts;
  try {
    facts = await dbSelect('fact',
      'patient_id=eq.' + encodeURIComponent(patientId) +
      (date ? '&measured_at=eq.' + date : '') +
      '&select=compound,sample_value,baseline,log2fc');
  } catch (e) {
    console.error('パスウェイ用fact取得失敗', e);
    facts = [];
  }
  const factMap = {};
  facts.forEach(function(f) { factMap[f.compound] = f; });

  function draw() { renderPathwayOverlay(factMap); }
  function drawAfterLayout() {
    requestAnimationFrame(function() { requestAnimationFrame(draw); });
  }

  if (img.complete && img.naturalWidth > 0) {
    drawAfterLayout();
  } else {
    img.onload = drawAfterLayout;
    img.src = '/pathway_base.png';
  }
}

function pathwayColorForLog2fc(log2fc) {
  if (log2fc === null || log2fc === undefined) return '#d1d5db';
  const intensity = Math.min(Math.abs(log2fc) / 3.0, 1.0);
  if (log2fc > 0) {
    const g = Math.round(255 - 200 * intensity);
    return 'rgb(255,' + g + ',' + g + ')';
  } else {
    const r = Math.round(255 - 200 * intensity);
    const g = Math.round(255 - 150 * intensity);
    return 'rgb(' + r + ',' + g + ',255)';
  }
}

function renderPathwayOverlay(factMap) {
  const svg = document.getElementById('pathway-svg');
  const img = document.getElementById('pathway-img');
  const IMG_W = 4001, IMG_H = 2250; // ベース画像の実寸
  const COORD_SCALE = IMG_W / 1280.0; // 座標データは1280px基準のため変換が必要

  // SVGのサイズを、画像の実際の描画サイズ(offsetWidth)に直接合わせる(検証済みの方式)
  const renderedW = img.offsetWidth || img.clientWidth || IMG_W;
  const renderedH = renderedW * (IMG_H / IMG_W);
  svg.style.width = renderedW + 'px';
  svg.style.height = renderedH + 'px';
  svg.setAttribute('viewBox', '0 0 ' + IMG_W + ' ' + IMG_H);

  let rectsHtml = '';
  _pathwayCoords.forEach(function(s) {
    if (s.compound === '楕円 130') return;
    let dbName = s.compound;
    Object.keys(PATHWAY_ALIAS).forEach(function(db) {
      if (PATHWAY_ALIAS[db] === s.compound) dbName = db;
    });
    const f = factMap[dbName];
    const log2fc = (f && f.sample_value > 0 && f.baseline > 0) ? f.log2fc : null;
    const color = pathwayColorForLog2fc(log2fc);
    const safeId = dbName.replace(/'/g, '').replace(/ /g, '_').replace(/\+/g, 'p');
    const px = s.x * COORD_SCALE, py = s.y * COORD_SCALE, psize = 19 * COORD_SCALE;
    rectsHtml += '<rect x="' + px + '" y="' + py + '" width="' + psize + '" height="' + psize + '" fill="' + color +
      '" stroke="#333" stroke-width="1.5" style="cursor:pointer" onclick="showPathwayCompound(\'' + safeId + '\')"/>';
  });

  // ── パターン検出(供給不足型・詰まり型) ──
  const log2fcMap = {};
  Object.keys(factMap).forEach(function(c) {
    const f = factMap[c];
    log2fcMap[c] = (f && f.sample_value > 0 && f.baseline > 0) ? f.log2fc : null;
  });

  const patterns = detectPathwayPatterns(log2fcMap);
  window._pathwayPatterns = patterns;

  let patternHtml = '';
  patterns.forEach(function(p, idx) {
    const coords = p.members.map(function(m) {
      const s = _pathwayCoords.find(function(c) {
        let dbName = c.compound;
        Object.keys(PATHWAY_ALIAS).forEach(function(db) { if (PATHWAY_ALIAS[db] === c.compound) dbName = db; });
        return dbName === m;
      });
      return s;
    }).filter(Boolean);
    if (!coords.length) return;

    // 大きな1つの枠は使わず、常に化合物ごとに個別の小さな枠で囲む(無関係な範囲を巻き込まないため)
    coords.forEach(function(s) {
      const cx = s.x * COORD_SCALE - 10, cy = s.y * COORD_SCALE - 10;
      const w = 19 * COORD_SCALE + 20, h = 19 * COORD_SCALE + 20;
      patternHtml += '<rect class="pathway-pattern-rect" x="' + cx + '" y="' + cy + '" width="' + w + '" height="' + h +
        '" rx="10" fill="rgba(230,0,172,0.10)" stroke="#e600ac" stroke-width="4" filter="url(#pathway-glow)" ' +
        'style="cursor:pointer" onclick="event.stopPropagation();showPathwayPattern(' + idx + ')"/>';
    });
  });

  svg.innerHTML = '<defs><filter id="pathway-glow" x="-50%" y="-50%" width="200%" height="200%">' +
    '<feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter></defs>' + rectsHtml + patternHtml;

  window._pathwayFactMap = factMap;
}

// ── パターン検出ロジック ──
function detectPathwayPatterns(log2fcMap) {
  const patterns = [];
  const SIG_THRESHOLD = 1.0;   // 供給不足型: この値を超えたら有意とみなす
  const BLOCK_THRESHOLD = 0.5; // 詰まり型: 上流・下流の逆転判定のしきい値

  // ① 詰まり型: エッジA→Bで、Aが+方向・Bが-方向(またはその逆)に有意な場合
  const blockages = [];
  _pathwayEdges.forEach(function(edge) {
    const a = edge[0], b = edge[1];
    const fa = log2fcMap[a], fb = log2fcMap[b];
    if (fa == null || fb == null) return;
    if (fa > BLOCK_THRESHOLD && fb < -BLOCK_THRESHOLD) {
      blockages.push({ members: [a, b], type: '詰まり型', upstream: a, downstream: b, upVal: fa, downVal: fb });
    } else if (fa < -BLOCK_THRESHOLD && fb > BLOCK_THRESHOLD) {
      blockages.push({ members: [a, b], type: '詰まり型', upstream: b, downstream: a, upVal: fb, downVal: fa });
    }
  });
  blockages.forEach(function(bl) {
    patterns.push({
      members: bl.members,
      type: '詰まり型',
      title: '詰まり型パターン検出',
      text: bl.upstream + 'が基準より上昇(' + bl.upVal.toFixed(2) + ')している一方、その先の' + bl.downstream + 'は低下(' + bl.downVal.toFixed(2) + ')しています。' + bl.upstream + 'から' + bl.downstream + 'への変換ステップで処理が追いついていない状態(詰まり)を示唆します。',
      clinical: 'この変換ステップに関わる酵素・補酵素(ビタミン・ミネラル等)の充足状況を確認することが有用と考えられます。'
    });
  });

  // ② 供給不足型: 隣接する有意な化合物(同方向)の連結成分をまとめる
  const significant = {};
  Object.keys(log2fcMap).forEach(function(c) {
    if (log2fcMap[c] != null && Math.abs(log2fcMap[c]) > SIG_THRESHOLD) significant[c] = log2fcMap[c];
  });
  const adjacency = {};
  _pathwayEdges.forEach(function(edge) {
    adjacency[edge[0]] = adjacency[edge[0]] || [];
    adjacency[edge[0]].push(edge[1]);
    adjacency[edge[1]] = adjacency[edge[1]] || [];
    adjacency[edge[1]].push(edge[0]);
  });
  const visited = {};
  Object.keys(significant).forEach(function(start) {
    if (visited[start]) return;
    const cluster = [];
    const stack = [start];
    const dir = significant[start] > 0 ? 1 : -1;
    while (stack.length) {
      const node = stack.pop();
      if (visited[node]) continue;
      visited[node] = true;
      cluster.push(node);
      (adjacency[node] || []).forEach(function(nb) {
        if (significant[nb] != null && !visited[nb] && (significant[nb] > 0 ? 1 : -1) === dir) {
          stack.push(nb);
        }
      });
    }
    // クラスタが大きすぎる(複数のパスウェイにまたがる)場合は、
    // 臨床的な意味が薄れる&図上で巨大な範囲を占めてしまうため採用しない
    if (cluster.length >= 3 && cluster.length <= 6) {
      patterns.push({
        members: cluster,
        type: '供給不足型',
        title: '供給不足型パターン検出',
        text: cluster.join('・') + 'にわたって、隣接する複数の代謝物が同じ方向(' + (dir>0?'上昇':'低下') + ')に連鎖的に変動しています。',
        clinical: '特定の酵素ではなく、経路全体を通る基質供給そのものが' + (dir>0?'過剰':'不足') + 'している可能性があります。関連する栄養摂取・全体的な代謝活動量の見直しが有用と考えられます。'
      });
    }
  });

  return patterns;
}

function showPathwayPattern(idx) {
  const p = (window._pathwayPatterns || [])[idx];
  if (!p) return;
  const panel = document.getElementById('pathway-detail-panel');
  panel.classList.remove('hidden');
  panel.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<h3 style="margin:0!important;color:#e600ac;font-size:16px!important;font-weight:700!important">' + p.title + ' [' + p.type + ']</h3>' +
      '<button onclick="document.getElementById(\'pathway-detail-panel\').classList.add(\'hidden\')" style="background:none;border:none;font-size:20px!important;color:var(--ink4);cursor:pointer">✕</button>' +
    '</div>' +
    '<p style="font-size:13px!important;line-height:1.6!important;color:#374151;margin:6px 0">' + p.text + '</p>' +
    '<div style="background:#fce7f3;padding:10px 12px;border-radius:8px;font-size:12px!important;line-height:1.6!important;margin-top:8px"><strong>臨床的示唆:</strong> ' + p.clinical + '</div>';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  animatePathwaySequence(p.members);
}

function animatePathwaySequence(members) {
  const svg = document.getElementById('pathway-svg');
  const svgns = 'http://www.w3.org/2000/svg';
  const IMG_W = 4001, COORD_SCALE = IMG_W / 1280.0;
  members.forEach(function(name, i) {
    const s = _pathwayCoords.find(function(c) {
      let dbName = c.compound;
      Object.keys(PATHWAY_ALIAS).forEach(function(db) { if (PATHWAY_ALIAS[db] === c.compound) dbName = db; });
      return dbName === name;
    });
    if (!s) return;
    setTimeout(function() {
      const circle = document.createElementNS(svgns, 'circle');
      circle.setAttribute('cx', (s.x + 9.5) * COORD_SCALE);
      circle.setAttribute('cy', (s.y + 9.5) * COORD_SCALE);
      circle.setAttribute('r', 8);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', '#fbbf24');
      circle.setAttribute('stroke-width', '6');
      circle.style.animation = 'pathwayPulse 1.2s ease-out forwards';
      svg.appendChild(circle);
      setTimeout(function() { circle.remove(); }, 1300);
    }, i * 450);
  });
}

function showPathwayCompound(safeId) {
  const factMap = window._pathwayFactMap || {};
  // safeIdから元の化合物名を逆引き
  let dbName = null;
  Object.keys(_pathwayClinicalDb).concat(Object.keys(factMap)).forEach(function(name) {
    const sid = name.replace(/'/g, '').replace(/ /g, '_').replace(/\+/g, 'p');
    if (sid === safeId) dbName = name;
  });
  if (!dbName) return;

  const f = factMap[dbName];
  const entry = _pathwayClinicalDb[dbName];
  let role = '(生化学的な説明は準備中です)', high = null, low = null, hasClinical = false;
  if (entry) {
    if (typeof entry === 'string') { role = entry; }
    else { role = entry.role; high = entry.high; low = entry.low; hasClinical = true; }
  }

  const sampleValue = (f && f.sample_value > 0) ? f.sample_value : null;
  const baseline = f ? f.baseline : null;
  const log2fc = (sampleValue !== null && baseline > 0) ? f.log2fc : null;
  const fold = (log2fc !== null) ? Math.pow(2, log2fc).toFixed(2) : null;

  const panel = document.getElementById('pathway-detail-panel');
  panel.classList.remove('hidden');
  panel.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<h3 style="margin:0!important;color:var(--emerald);font-size:16px!important;font-weight:700!important;line-height:1.3!important">' + dbName + '</h3>' +
      '<button onclick="document.getElementById(\'pathway-detail-panel\').classList.add(\'hidden\')" style="background:none;border:none;font-size:20px!important;color:var(--ink4);cursor:pointer">✕</button>' +
    '</div>' +
    '<div style="background:var(--foam);padding:10px 12px;border-radius:8px;font-size:13px!important;line-height:1.6!important;color:var(--ink2);margin-bottom:10px">' + role + '</div>' +
    '<div style="display:flex;gap:10px;margin-bottom:10px">' +
      '<div style="background:#eef2ff;padding:8px 10px;border-radius:8px;text-align:center;flex:1"><div style="font-size:10px!important;color:var(--ink4)">実測値</div><div style="font-size:15px!important;font-weight:700!important">' + (sampleValue !== null ? sampleValue : '—') + '</div></div>' +
      '<div style="background:#eef2ff;padding:8px 10px;border-radius:8px;text-align:center;flex:1"><div style="font-size:10px!important;color:var(--ink4)">基準値</div><div style="font-size:15px!important;font-weight:700!important">' + (baseline !== null ? Number(baseline).toFixed(2) : '—') + '</div></div>' +
      '<div style="background:#eef2ff;padding:8px 10px;border-radius:8px;text-align:center;flex:1"><div style="font-size:10px!important;color:var(--ink4)">log2FC</div><div style="font-size:15px!important;font-weight:700!important">' + (log2fc !== null ? (log2fc>0?'+':'')+log2fc.toFixed(2) : '—') + '</div>' + (fold ? '<div style="font-size:10px!important;color:var(--ink4)">基準の' + fold + '倍</div>' : '') + '</div>' +
    '</div>' +
    (hasClinical ?
      '<div style="background:#fee2e2;padding:8px 10px;border-radius:8px;margin-bottom:6px;font-size:12px!important;line-height:1.6!important"><strong>↑高い場合:</strong> ' + high + '</div>' +
      '<div style="background:#dbeafe;padding:8px 10px;border-radius:8px;font-size:12px!important;line-height:1.6!important"><strong>↓低い場合:</strong> ' + low + '</div>'
      : '<div style="font-size:10px!important;color:var(--ink4);border-top:1px dashed var(--border);padding-top:6px;margin-top:6px">この化合物の血中変動と臨床病態を結びつける確立された知見は限定的です。</div>');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

let _pathwayZoomLevel = 1.0;
function pathwayZoom(delta) {
  if (delta === 0) { _pathwayZoomLevel = 1.0; }
  else { _pathwayZoomLevel = Math.max(0.5, Math.min(3.0, _pathwayZoomLevel + delta)); }
  const img = document.getElementById('pathway-img');
  img.style.width = (_pathwayZoomLevel * 100) + '%';
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      if (window._pathwayFactMap) renderPathwayOverlay(window._pathwayFactMap);
    });
  });
}

function togglePathwayPatterns() {
  const checked = document.getElementById('pathway-pattern-toggle').checked;
  document.querySelectorAll('.pathway-pattern-rect').forEach(function(r) {
    r.style.display = checked ? 'block' : 'none';
  });
}

// ウィンドウリサイズ時、パスウェイモード表示中なら再描画してズレを防ぐ
(function() {
  let resizeTimer = null;
  function scheduleRedraw() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      const pathwayView = document.getElementById('clinic-view-pathway');
      if (pathwayView && !pathwayView.classList.contains('hidden') && window._pathwayFactMap) {
        renderPathwayOverlay(window._pathwayFactMap);
      }
    }, 150);
  }

  // ウィンドウ自体のリサイズ(画面回転含む)
  window.addEventListener('resize', scheduleRedraw);
  window.addEventListener('orientationchange', scheduleRedraw);

  // コンテナ要素自体のサイズ変化(サイドバー開閉・レイアウト変更等、windowのresizeが発火しないケースも検知)
  if (typeof ResizeObserver !== 'undefined') {
    const setupObserver = function() {
      const wrap = document.getElementById('pathway-wrap');
      if (!wrap) { setTimeout(setupObserver, 500); return; }
      const ro = new ResizeObserver(scheduleRedraw);
      ro.observe(wrap);
    };
    setupObserver();
  }
})();
