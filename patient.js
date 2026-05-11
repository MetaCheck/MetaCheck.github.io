// patient.js — 患者マイページ

// catName is defined in i18n.js


// ─── 解析IDから日付を算出（先頭6桁: YYMMDD）────
function dateFromPatientId(patientId) {
  if (!patientId || patientId.length < 6) return '';
  var yy = patientId.slice(0, 2);
  var mm = patientId.slice(2, 4);
  var dd = patientId.slice(4, 6);
  return '20' + yy + '-' + mm + '-' + dd;
}

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

async function renderPatientPage(patient) {
  const displayName = patient.name || patient.id;
  document.getElementById('patient-avatar').textContent = patient.id.slice(-3);
  document.getElementById('patient-name-display').textContent = displayName + ' ' + t('patient.san');
  document.getElementById('patient-display-id').textContent = t('patient.analysisId') + ': ' + patient.id;
  document.getElementById('patient-display-name').textContent = displayName + ' ' + t('patient.san');
  document.getElementById('patient-display-meta').textContent =
    [patient.sex, patient.country].filter(Boolean).join(' / ') || '';

  const det = document.getElementById('patient-category-detail');
  if (det) det.setAttribute('hidden', '');

  try {
    const allIds = currentUser.allIds || [patient.id];
    var scores;
    if (allIds.length > 1) {
      scores = await fetchScoresMulti(allIds);
    } else {
      scores = await fetchScores(patient.id);
    }
    window._patientAllIds = allIds;

    // 最新スコアが未公開の場合は待機画面を表示
    const releasedScores = scores.filter(function(s) { return s.is_released === true; });
    if (!releasedScores.length && scores.length > 0) {
      const grid = document.getElementById('patient-score-grid');
      if (grid) {
        grid.style.cssText = '';
        grid.innerHTML =
          '<div style="background:var(--foam);border:1px solid var(--sage);border-radius:12px;padding:28px;text-align:center;margin-bottom:16px">' +
            '<div style="font-size:36px;margin-bottom:12px">🔬</div>' +
            '<div style="font-size:15px;font-weight:600;color:var(--forest);margin-bottom:8px">'+t('patient.pendingTitle')+'</div>' +
            '<div style="font-size:13px;color:var(--ink3);line-height:1.7">'+t('patient.pendingSub')+'</div>' +
          '</div>';
      }
      return;
    }

    window._patientScores = releasedScores.length ? releasedScores : scores;
    renderPatientScores(window._patientScores);
    renderAlertBanner(window._patientScores);
    if (allIds.length > 1) {
      renderScoreTrendChart(allIds);
    }
  } catch(e) { console.error(e); }

}

function renderAlertBanner(scores) {
  const eCount = scores.filter(s => s.rank === 'E').length;
  const banner = document.getElementById('patient-alert-banner');
  if (!banner) return;
  banner.textContent = eCount > 0
    ? t('patient.alertBanner').replace('{n}', eCount)
    : '';
  banner.style.display = eCount > 0 ? 'block' : 'none';
}

function renderPatientScores(scores) {
  const grid = document.getElementById('patient-score-grid');
  if (!grid) return;
  if (!scores.length) {
    grid.innerHTML = '<div style="color:var(--ink4);padding:20px">'+t('patient.noScore')+'</div>';
    return;
  }
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px';
  grid.innerHTML = scores.map(function(s, i) {
    const rank = s.rank || '—';
    return '<div class="pt-score-row" onclick="selectPatientScore(' + i + ',this)" style="flex-direction:column;align-items:flex-start;gap:6px;padding:12px;position:relative">' +
      '<span class="rank-badge rank-' + rank + '" style="position:absolute;top:10px;right:10px;width:26px;height:26px;font-size:12px">' + rank + '</span>' +
      '<span class="pt-score-name" style="font-size:11px;padding-right:32px;line-height:1.4">' + catName(s.category) + '</span>' +
    '</div>';
  }).join('');
}

function selectPatientScore(index, el) {
  window._currentPatientIndex = index;
  document.querySelectorAll('.pt-score-row').forEach(function(r) { r.classList.remove('active'); });
  if (el) el.classList.add('active');

  const s = window._patientScores && window._patientScores[index];
  if (!s) return;

  const det = document.getElementById('patient-category-detail');
  const card = document.getElementById('patient-detail-card');
  if (!det || !card) return;

  det.removeAttribute('hidden');
  const rank = s.rank || '—';

  card.innerHTML = '<div style="color:var(--ink4);font-size:12px;padding:8px">'+t('patient.loading')+'</div>';

  // fetchInsightsByCategoryからmovementを取得
  fetchInsightsByCategory(s.patient_id || currentUser.id, s.category).then(function(insData) {
    var movement = insData ? insData.movement : null;
    var metTags = movement ? movement.split('、').map(function(m) {
      var dir = m.includes('↓') ? 'down' : m.includes('↑') ? 'up' : 'neutral';
      return '<span class="metabolite-tag ' + dir + '">' + m.trim() + '</span>';
    }).join('') : '';

    var catDescText = (typeof CAT_DESC !== 'undefined' && CAT_DESC[currentLang] && CAT_DESC[currentLang][s.category]) || '';

    card.innerHTML =
      '<div class="detail-card__title">' +
        '<span class="rank-badge rank-' + rank + '">' + rank + '</span> ' + catName(s.category) +
      '</div>' +
      (catDescText ? '<div style="margin:10px 0;padding:10px 14px;background:var(--foam);border-left:3px solid var(--sage);border-radius:0 8px 8px 0;font-size:12px;color:var(--ink2);line-height:1.7">' + catDescText + '</div>' : '') +
      (metTags ? '<div style="margin-bottom:14px"><div style="font-size:11px;color:var(--ink4);margin-bottom:6px">'+t('patient.mainChanges')+'</div><div style="display:flex;flex-wrap:wrap;gap:6px">' + metTags + '</div></div>' : '') +
      '<div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:16px">' +
        '<button class="pt-tab pt-tab--active" onclick="switchPatientTab(this,\'metabolite\')" data-tab="metabolite">'+t('patient.metabolite')+'</button>' +
        '<button class="pt-tab" onclick="switchPatientTab(this,\'advice\')" data-tab="advice">'+t('patient.advice')+'</button>' +
      '</div>' +
      '<div id="patient-tab-metabolite">' +
        '<div id="patient-trend-chart" style="margin-bottom:16px"></div>' +
        '<div id="patient-metabolite-table"><div style="color:var(--ink4);font-size:12px;padding:8px">読み込み中...</div></div>' +
      '</div>' +
      '<div id="patient-tab-advice" style="display:none"><div id="patient-insights-box"></div></div>';

    renderTrendChart(window._patientAllIds || [currentUser.id], s.category);
    loadMetaboliteTable(window._patientAllIds || [currentUser.id], s.category);

    fetchInsightsByCategory(currentUser.id, s.category).then(async function(ins) {
      const el2 = document.getElementById('patient-insights-box');
      if (!el2) return;
      if (!ins || !insightField(ins, 'patient_comment')) {
        el2.innerHTML = '<div style="color:var(--ink4);font-size:13px;padding:12px">' + t('patient.noData') + '</div>';
        return;
      }
      el2.innerHTML = '<div style="color:var(--ink4);font-size:12px;padding:8px">'+t('patient.loading')+'</div>';

      // AI要約
      const summarized = await summarizeInsight(insightField(ins, 'patient_comment'), 'patient');
      // 言語が日本語以外なら翻訳
      const translated = currentLang !== 'ja' ? await translateText(summarized, currentLang) : summarized;

      el2.innerHTML =
        '<div class="insight-box insight-box--amber">' +
          '<div class="insight-label">🗒 ' + t('patient.advice') + '</div>' +
          '<div style="line-height:1.8">' + translated + '</div>' +
          '<div style="margin-top:12px;text-align:right">' +
            '<button onclick="showFullInsight(\'' + encodeURIComponent(insightField(ins, 'patient_comment')) + '\')" style="background:none;border:none;color:var(--emerald);font-size:12px;cursor:pointer;text-decoration:underline">'+t('patient.seeDetail')+'</button>' +
          '</div>' +
        '</div>';
    });
  });
}

function showFullInsight(encodedText) {
  const text = decodeURIComponent(encodedText);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:24px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<div style="font-size:14px;font-weight:600;color:var(--forest)">'+t('patient.detailTitle')+'</div>' +
        '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--ink4)">✕</button>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--ink2);line-height:1.9;white-space:pre-wrap">' + text + '</div>' +
    '</div>';
  document.body.appendChild(overlay);
}

function switchPatientTab(btn, tab) {
  document.querySelectorAll('.pt-tab').forEach(function(b) { b.classList.remove('pt-tab--active'); });
  btn.classList.add('pt-tab--active');
  document.getElementById('patient-tab-metabolite').style.display = tab === 'metabolite' ? '' : 'none';
  document.getElementById('patient-tab-advice').style.display = tab === 'advice' ? '' : 'none';
}

async function renderTrendChart(patientIds, category) {
  const el = document.getElementById('patient-trend-chart');
  if (!el) return;
  try {
    const idList = Array.isArray(patientIds) ? patientIds : [patientIds];
    const compounds = await dbSelect('compound_categories',
      'category=eq.' + encodeURIComponent(category) + '&select=compound,weight&order=weight.desc');
    if (!compounds.length) { el.innerHTML = ''; return; }

    const compList = compounds.map(function(c) { return '"' + c.compound + '"'; }).join(',');

    // 全解析IDの全測定日のfactデータを取得
    const idFilter = idList.map(function(id) { return '"' + id + '"'; }).join(',');
    const facts = await dbSelect('fact',
      'patient_id=in.(' + idFilter + ')&compound=in.(' + compList + ')&select=compound,sample_value,baseline,log2fc,measured_at,patient_id&order=measured_at.asc');

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
    yAxis += '<text x="14" y="' + (padT + 10) + '" text-anchor="middle" font-size="9" fill="#B03A2E" font-weight="bold">'+t('clinic.highUp')+'</text>';
    yAxis += '<text x="14" y="' + (padT + chartH - 4) + '" text-anchor="middle" font-size="9" fill="#4A90D9" font-weight="bold">'+t('clinic.lowDown')+'</text>';

    // X軸ラベル
    var xLabels = '';
    dates.forEach(function(d, i) {
      var x = dates.length === 1 ? padL + chartW / 2 : padL + (chartW / (dates.length - 1)) * i;
      xLabels += '<text x="' + x + '" y="' + (H - 6) + '" text-anchor="middle" font-size="9" fill="#8FAAA0">' + d.slice(0, 10) + '</text>';
      xLabels += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (padT + chartH) + '" stroke="#D4E6DD" stroke-width="1"/>';
    });

    // X軸ラベル
    xLabels += '<text x="' + (padL + chartW / 2) + '" y="' + (H - 22) + '" text-anchor="middle" font-size="9" fill="#8FAAA0">'+t('clinic.measureDate')+'</text>';

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
        var tipText = c.compound + ' | '+t('patient.measured')+':' + (f.sample_value != null ? Number(f.sample_value).toFixed(2) : '—') + ' | '+t('patient.baseline')+':' + (f.baseline != null ? Number(f.baseline).toFixed(2) : '—') + ' | log2FC:' + Number(f.log2fc).toFixed(3);
        dots += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + color + '" stroke="#fff" stroke-width="1.5" opacity="0.85" style="cursor:pointer"' +
          ' onmouseover="showChartTooltip(event,this.dataset.tip)" onmouseout="hideChartTooltip()"' +
          ' data-tip="' + tipText.replace(/"/g, '&quot;') + '"/>';
      });
    });

    el.innerHTML =
      '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="overflow:visible;display:block">' +
        yAxis + xLabels + dots +
      '</svg>';

  } catch(e) { el.innerHTML = ''; }
}

async function loadMetaboliteTable(patientIds, category) {
  const el = document.getElementById('patient-metabolite-table');
  if (!el) return;
  try {
    const idList = Array.isArray(patientIds) ? patientIds : [patientIds];
    const compounds = await dbSelect('compound_categories',
      'category=eq.' + encodeURIComponent(category) + '&select=compound,weight&order=weight.desc');
    if (!compounds.length) { el.innerHTML = ''; return; }
    const compList = compounds.map(function(c) { return '"' + c.compound + '"'; }).join(',');
    const idFilter = idList.map(function(id) { return '"' + id + '"'; }).join(',');
    const facts = await dbSelect('fact',
      'patient_id=in.(' + idFilter + ')&compound=in.(' + compList + ')&select=compound,sample_value,baseline,measured_at,patient_id&order=measured_at.asc');

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

    // ヘッダー
    var thDates = dates.map(function(d) {
      return '<th>'+t('patient.measured')+'(' + d.slice(0, 10).replace(/-/g, '/') + ')</th>';
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

        // 差分表示（実測値 - 基準値）赤/青
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
        '<td><span style="background:var(--emerald);color:#fff;font-size:11px;padding:3px 8px;border-radius:6px;display:inline-block;min-width:32px;text-align:center">' + c.weight + '</span></td>' +
        '<td style="font-family:var(--font-mono);color:var(--ink4)">' + baseline + '</td>' +
        cells +
        '</tr>';
    });

    el.innerHTML = '<div class="table-scroll-wrap"><table class="score-table" style="min-width:480px;margin-top:4px">' +
      '<thead><tr><th>' + t('patient.compound') + '</th><th>' + t('patient.weight') + '</th><th>' + t('patient.baseline') + '</th>' + thDates + '</tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  } catch(e) {
    el.innerHTML = '<div style="color:var(--ink4);font-size:12px">'+t('clinic.error')+'</div>';
  }
}

// ─── 身体情報の取得 ────────────────────────
async function fetchBodyInfo(userId) {
  try {
    var rows = await dbSelect('patient_profiles', 'user_id=eq.' + userId + '&limit=1');
    return rows && rows.length ? rows[0] : null;
  } catch(e) { return null; }
}

// ─── 身体情報編集モーダルを開く ────────────
async function openBodyInfoModal() {
  var userId = currentUser?.userId;
  if (!userId) return;
  var info = await fetchBodyInfo(userId);

  // フォームに現在値をセット
  var fields = ['height_cm','weight_kg','sex','birth_date','smoking','drinking','exercise','diet_note','menstrual','supplements_other'];
  var idMap = {
    height_cm: 'edit-body-height', weight_kg: 'edit-body-weight',
    sex: 'edit-body-sex', birth_date: 'edit-body-birth-date',
    smoking: 'edit-body-smoking', drinking: 'edit-body-drinking',
    exercise: 'edit-body-exercise', diet_note: 'edit-body-diet',
    menstrual: 'edit-body-menstrual', supplements_other: 'edit-body-supplements-other'
  };
  fields.forEach(function(f) {
    var el = document.getElementById(idMap[f]);
    if (el && info && info[f] != null) el.value = info[f];
  });

  // チェックボックス系
  var chkFields = { medical_history: 'edit-chk-medical', medications: 'edit-chk-medications', supplements: 'edit-chk-supplements' };
  Object.keys(chkFields).forEach(function(field) {
    var container = document.getElementById(chkFields[field]);
    if (!container) return;
    var vals = (info && info[field]) ? info[field] : [];
    container.querySelectorAll('input[type="checkbox"]').forEach(function(chk) {
      chk.checked = vals.includes(chk.value);
    });
  });

  openModal('modal-body-info');
}

// ─── 身体情報を保存 ────────────────────────
async function saveBodyInfo() {
  var userId = currentUser?.userId;
  if (!userId) return;

  function getChecked(containerId) {
    return Array.from(document.querySelectorAll('#' + containerId + ' input[type="checkbox"]:checked'))
      .map(function(el) { return el.value; });
  }

  var bodyInfo = {
    height_cm: parseFloat(document.getElementById('edit-body-height')?.value) || null,
    weight_kg: parseFloat(document.getElementById('edit-body-weight')?.value) || null,
    sex: document.getElementById('edit-body-sex')?.value || null,
    birth_date: document.getElementById('edit-body-birth-date')?.value || null,
    smoking: document.getElementById('edit-body-smoking')?.value || 'none',
    drinking: document.getElementById('edit-body-drinking')?.value || 'none',
    exercise: document.getElementById('edit-body-exercise')?.value || 'none',
    diet_note: document.getElementById('edit-body-diet')?.value || 'none',
    menstrual: document.getElementById('edit-body-menstrual')?.value || 'na',
    medical_history: getChecked('edit-chk-medical'),
    medications: getChecked('edit-chk-medications'),
    supplements: getChecked('edit-chk-supplements'),
    supplements_other: document.getElementById('edit-body-supplements-other')?.value.trim() || null,
    updated_at: new Date().toISOString()
  };

  try {
    // upsert
    await fetch(SUPABASE_URL + '/rest/v1/patient_profiles', {
      method: 'POST',
      headers: Object.assign({}, getHeaders(), { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(Object.assign({ user_id: userId }, bodyInfo))
    });
    closeModal('modal-body-info');
    showToast(t('body.saved') || '身体情報を保存しました', 'success');
  } catch(e) {
    showToast('保存に失敗しました', 'error');
  }
}

// ─── 解析ID追加モーダルを開く ────────────
function openAddAnalysisModal() {
  document.getElementById('input-add-analysis-id').value = '';
  document.getElementById('add-analysis-error').textContent = '';
  document.getElementById('add-analysis-error').classList.add('hidden');
  // 身体情報を現在値でセット（次のステップで確認）
  openModal('modal-add-analysis');
}

// ─── 解析IDを追加して紐付け ────────────────
async function doAddAnalysisId() {
  var userId = currentUser?.userId;
  var analysisId = document.getElementById('input-add-analysis-id')?.value.trim().toUpperCase();
  var errEl = document.getElementById('add-analysis-error');

  if (!analysisId) {
    errEl.textContent = t('auth.analysisIdRequired') || '解析IDを入力してください';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    // 解析IDの存在確認
    var patient = await fetchPatient(analysisId);
    if (!patient) {
      errEl.textContent = t('auth.analysisIdNotFound') || '解析IDが見つかりません';
      errEl.classList.remove('hidden');
      return;
    }

    // 現在の身体情報を取得してスナップショット保存
    var info = await fetchBodyInfo(userId);

    // 解析IDと紐付け
    await linkAnalysisId(userId, analysisId, currentUser.email);

    // analysis_snapshotsに保存
    if (info) {
      var snapshot = Object.assign({}, info, { user_id: userId, analysis_id: analysisId });
      delete snapshot.updated_at;
      snapshot.created_at = new Date().toISOString();
      await fetch(SUPABASE_URL + '/rest/v1/analysis_snapshots', {
        method: 'POST',
        headers: Object.assign({}, getHeaders(), { 'Prefer': 'return=minimal' }),
        body: JSON.stringify(snapshot)
      });
    }

    closeModal('modal-add-analysis');
    showToast(t('patient.analysisAdded') || '解析IDを追加しました', 'success');

    // マイページ更新
    currentUser.allIds = (currentUser.allIds || []).concat([analysisId]);
    renderPatientPage(currentUser);

  } catch(e) {
    errEl.textContent = e.message || '追加に失敗しました';
    errEl.classList.remove('hidden');
  }
}

// ─── スコア推移グラフ（複数解析ID） ──────────
async function renderScoreTrendChart(patientIds) {
  var el = document.getElementById('patient-trend-overview');
  if (!el) {
    var grid = document.getElementById('patient-score-grid');
    if (!grid) return;
    el = document.createElement('div');
    el.id = 'patient-trend-overview';
    el.style.cssText = 'margin-bottom:20px';
    grid.parentNode.insertBefore(el, grid);
  }
  el.innerHTML = '<div style="color:var(--ink4);font-size:12px;padding:8px">読み込み中...</div>';

  try {
    var idList = patientIds.map(function(id) { return '"' + id + '"'; }).join(',');
    var allScores = await dbSelect('scores', 'patient_id=in.(' + idList + ')&select=patient_id,category,wavg,rank,measured_at&order=measured_at.asc');
    if (!allScores.length) { el.innerHTML = ''; return; }

    var dates = [];
    // patient_idの先頭6桁から日付を取得
    var dateMap = {}; // patient_id → date
    allScores.forEach(function(s) {
      var d = dateFromPatientId(s.patient_id);
      dateMap[s.patient_id] = d;
      if (d && dates.indexOf(d) === -1) dates.push(d);
    });
    dates.sort();
    if (dates.length < 2) { el.innerHTML = ''; return; }

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

    var W = Math.max(el.offsetWidth || 360, 300);
    var H = 220;
    var padL = 10, padR = 10, padT = 20, padB = 50;
    var chartW = W - padL - padR;
    var chartH = H - padT - padB;
    var barGroupW = chartW / dates.length;
    var barW = Math.max(Math.min(barGroupW / categories.length * 0.7, 16), 4);

    var maxWavg = 1;
    allScores.forEach(function(s) { if (s.wavg != null && Number(s.wavg) > maxWavg) maxWavg = Number(s.wavg); });

    var bars = '';
    var lines = '';

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

        bars += '<rect x="' + barX + '" y="' + barY + '" width="' + (barW - 1) + '" height="' + barH2 + '"' +
          ' fill="' + color + '" opacity="0.85" rx="1"' +
          ' data-tip="' + catName(cat) + ' | ' + d + ' | wavg:' + wavg.toFixed(3) + ' | ' + (sc.rank || '') + '"' +
          ' style="cursor:pointer"' +
          ' onmouseover="showChartTooltip(event,this.dataset.tip)" onmouseout="hideChartTooltip()"/>';

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
      xLabels += '<text x="' + x + '" y="' + (H - 34) + '" text-anchor="middle" font-size="9" fill="#8FAAA0">' + d.slice(2).replace(/-/g, '/') + '</text>';
      xLabels += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (padT + chartH) + '" stroke="#D4E6DD" stroke-width="1"/>';
    });

    var baseline = '<line x1="' + padL + '" y1="' + (padT + chartH) + '" x2="' + (W - padR) + '" y2="' + (padT + chartH) + '" stroke="#D4E6DD" stroke-width="1"/>';

    el.innerHTML =
      '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink4);margin-bottom:8px">' + (t('patient.trendOverview') || 'スコア推移') + '</div>' +
      '<div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:12px;overflow-x:auto">' +
        '<svg width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="overflow:visible;display:block;min-width:300px">' +
          baseline + xLabels + bars + lines +
        '</svg>' +
      '</div>';

  } catch(e) { el.innerHTML = ''; }
}
