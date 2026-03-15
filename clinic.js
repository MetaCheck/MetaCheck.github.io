// ═══════════════════════════════════════════
//  clinic.js — クリニックポータル
// ═══════════════════════════════════════════

let allPatients = [];
let selectedPatientId = null;

async function renderClinicPage(clinicId) {
  // ヘッダー
  document.getElementById('clinic-avatar').textContent = clinicId;
  document.getElementById('clinic-name-display').textContent = `クリニック ${clinicId}`;

  // 患者リスト取得
  try {
    allPatients = await fetchPatientsByClinic(clinicId);
    renderPatientList(allPatients);
  } catch (e) {
    console.error('患者取得失敗', e);
  }

  // 検索
  document.getElementById('clinic-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderPatientList(allPatients.filter(p => p.id.toLowerCase().includes(q)));
  });

  // 患者追加モーダル
  document.getElementById('btn-add-patient')?.addEventListener('click', () => openModal('modal-add-patient'));

  // Excelアップロードモーダル
  document.getElementById('btn-upload-excel')?.addEventListener('click', () => openModal('modal-upload'));
}

// 患者リスト描画
async function renderPatientList(patients) {
  const list = document.getElementById('clinic-patient-list');
  if (!list) return;

  if (!patients.length) {
    list.innerHTML = '<li style="padding:16px;color:var(--ink4);font-size:13px">患者がいません</li>';
    return;
  }

  // スコアを一括取得（上位ランクのみ表示用）
  list.innerHTML = patients.map(p => `
    <li class="patient-item ${p.id === selectedPatientId ? 'active' : ''}"
        data-id="${p.id}"
        onclick="selectClinicPatient('${p.id}')">
      <div class="patient-item__dot">${p.id.slice(-3)}</div>
      <div class="patient-item__info">
        <div class="patient-item__id">${p.id}</div>
        <div style="font-size:11px;color:var(--ink4)">${[p.sex, p.country].filter(Boolean).join(' / ') || '—'}</div>
      </div>
    </li>`).join('');
}

// 患者選択
async function selectClinicPatient(patientId) {
  selectedPatientId = patientId;

  // リストのactive更新
  document.querySelectorAll('.patient-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === patientId);
  });

  // 空状態を隠して詳細を表示
  document.getElementById('clinic-empty-state')?.classList.add('hidden');
  const detail = document.getElementById('clinic-detail');
  detail?.classList.remove('hidden');

  // 患者情報セット
  const patient = allPatients.find(p => p.id === patientId);
  if (!patient) return;

  document.getElementById('clinic-detail-id').textContent = patient.id;
  document.getElementById('clinic-detail-name').textContent = patient.id;

  const meta = [patient.sex, patient.country, patient.age ? patient.age + '歳' : '', patient.disease]
    .filter(Boolean);
  document.getElementById('clinic-detail-meta').innerHTML =
    meta.map(m => `<span class="badge badge--green">${m}</span>`).join('');

  // スコア取得・描画
  try {
    const scores = await fetchScores(patientId);
    renderScoreOverview(scores);
    renderCatTabs(scores, patientId);
  } catch (e) {
    console.error('スコア取得失敗', e);
  }
}

// スコア概要カード（4枚）
function renderScoreOverview(scores) {
  const el = document.getElementById('clinic-score-overview');
  if (!el) return;

  const rankCounts = { A:0, B:0, C:0, D:0, E:0 };
  scores.forEach(s => { if (s.rank) rankCounts[s.rank] = (rankCounts[s.rank]||0)+1; });

  const worst = scores.sort((a,b) => (b.wavg_absfc||0) - (a.wavg_absfc||0))[0];
  const best  = scores.sort((a,b) => (a.wavg_absfc||0) - (b.wavg_absfc||0))[0];

  el.innerHTML = `
    <div class="score-ov-card">
      <div class="score-ov-card__label">カテゴリ数</div>
      <div class="score-ov-card__val">${scores.length}</div>
    </div>
    <div class="score-ov-card">
      <div class="score-ov-card__label">E ランク</div>
      <div class="score-ov-card__val" style="color:var(--rank-e)">${rankCounts.E}</div>
    </div>
    <div class="score-ov-card">
      <div class="score-ov-card__label">最も要注意</div>
      <div class="score-ov-card__val" style="font-size:14px;margin-top:4px">${worst?.category?.split('/')[0] || '—'}</div>
      <div class="score-ov-card__sub"><span class="rank-badge rank-${worst?.rank}">${worst?.rank||'—'}</span></div>
    </div>
    <div class="score-ov-card">
      <div class="score-ov-card__label">A ランク</div>
      <div class="score-ov-card__val" style="color:var(--rank-a)">${rankCounts.A}</div>
    </div>`;
}

// カテゴリタブ
function renderCatTabs(scores, patientId) {
  const tabs = document.getElementById('clinic-cat-tabs');
  if (!tabs) return;

  tabs.innerHTML = scores.map((s, i) => `
    <button class="cat-tab ${i===0?'active':''} rank-${s.rank}"
      onclick="selectCatTab(this,'${patientId}','${s.category}')">
      ${s.rank} ${s.category.split('/')[0].trim()}
    </button>`).join('');

  // 最初のカテゴリを表示
  if (scores.length) showCatDetail(patientId, scores[0].category, scores[0]);
}

function selectCatTab(btn, patientId, category) {
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  fetchScores(patientId).then(scores => {
    const s = scores.find(s => s.category === category);
    if (s) showCatDetail(patientId, category, s);
  });
}

function showCatDetail(patientId, category, score) {
  const el = document.getElementById('clinic-cat-detail');
  if (!el) return;

  const rank = score.rank || '—';
  el.innerHTML = `
    <div class="chart-wrap">
      <div class="chart-wrap__title">${category}</div>
      <div style="display:flex;align-items:center;gap:16px;padding:8px 0">
        <span class="rank-badge rank-${rank}" style="width:40px;height:40px;font-size:20px">${rank}</span>
        <div>
          <div style="font-size:11px;color:var(--ink4)">WAVG_absFC</div>
          <div style="font-family:var(--font-mono);font-size:18px;color:var(--forest)">
            ${score.wavg_absfc?.toFixed(4) || '—'}
          </div>
        </div>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
        <div style="display:flex;gap:12px;font-size:12px;color:var(--ink3)">
          <span>num_sum: <strong style="font-family:var(--font-mono)">${score.num_sum?.toFixed(3)||'—'}</strong></span>
          <span>den_sum: <strong style="font-family:var(--font-mono)">${score.den_sum?.toFixed(3)||'—'}</strong></span>
          <span>測定日: <strong>${score.measured_at||'—'}</strong></span>
        </div>
      </div>
    </div>`;
}
