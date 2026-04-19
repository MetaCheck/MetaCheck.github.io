// ═══════════════════════════════════════════
//  app.js — メイン制御
// ═══════════════════════════════════════════

// ─── モーダル ────────────────────────────

function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// ─── トースト通知 ──────────────────────

function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast${type ? ' toast--' + type : ''}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── 患者追加 ──────────────────────────

function generateAnalysisId(clinicCode) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String((allPatients ? allPatients.length : 0) + 1).padStart(2, '0');
  return yy + mm + dd + clinicCode.toUpperCase() + seq;
}

async function submitAddPatient() {
  if (!currentUser?.clinicId) return;
  const newId = generateAnalysisId(currentUser.clinicId);

  try {
    await insertPatient({
      id: newId,
      clinic_id: currentUser.clinicId,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    closeModal('modal-add-patient');
    showToast('解析ID ' + newId + ' を発行しました', 'success');
    // リスト更新して新患者を選択
    allPatients = await fetchPatientsByClinic(currentUser.clinicId);
    allPatients = (allPatients || []).sort((a, b) => b.id.localeCompare(a.id));
    renderPatientList(allPatients);
    if (typeof selectClinicPatient === 'function') selectClinicPatient(newId);
  } catch (e) {
    showToast('登録に失敗しました', 'error');
    console.error(e);
  }
}

// ─── 解析依頼送信 ─────────────────────

async function submitRequest() {
  const type    = document.getElementById('request-type')?.value;
  const message = document.getElementById('request-message')?.value.trim();

  // TODO: Supabaseのrequestsテーブルに保存（テーブル追加後に実装）
  closeModal('modal-request');
  showToast('依頼を送信しました', 'success');
  document.getElementById('request-message').value = '';
}

// ─── DOMContentLoaded ────────────────

document.addEventListener('DOMContentLoaded', () => {

  // 言語切替ウィジェット生成
  
  

  // モーダル閉じるボタン
  const modalClosePairs = [
    ['btn-close-request',     'modal-request'],
    ['btn-cancel-request',    'modal-request'],
    ['btn-close-upload',      'modal-upload'],
    ['btn-cancel-upload',     'modal-upload'],
    ['btn-close-add-patient', 'modal-add-patient'],
    ['btn-cancel-add-patient','modal-add-patient'],
  ];
  modalClosePairs.forEach(([btnId, modalId]) => {
    document.getElementById(btnId)?.addEventListener('click', () => closeModal(modalId));
  });

  // バックドロップクリックで閉じる
  ['modal-request','modal-upload','modal-add-patient'].forEach(id => {
    document.getElementById(id + '-backdrop')?.addEventListener('click', () => closeModal(id));
  });

  // 解析依頼送信
  document.getElementById('btn-submit-request')?.addEventListener('click', submitRequest);

  // 患者追加送信
  document.getElementById('btn-confirm-add-patient')?.addEventListener('click', submitAddPatient);

  // 患者追加モーダルを開く時にIDプレビューを更新
  document.getElementById('btn-add-patient')?.addEventListener('click', () => {
    if (currentUser?.clinicId) {
      const previewId = generateAnalysisId(currentUser.clinicId);
      const el = document.getElementById('preview-analysis-id');
      if (el) el.textContent = previewId;
    }
    openModal('modal-add-patient');
  });

  // メモ自動保存
  const memoEl = document.getElementById('clinic-memo');
  const savedEl = document.getElementById('memo-saved');
  let memoTimer;
  memoEl?.addEventListener('input', () => {
    clearTimeout(memoTimer);
    memoTimer = setTimeout(() => {
      // TODO: Supabase保存
      savedEl?.classList.remove('hidden');
      savedEl?.classList.add('show');
      setTimeout(() => savedEl?.classList.remove('show'), 2000);
    }, 800);
  });

});

// ─── ログイン処理 ────────────────────────

// doLogin と doLogout は auth.js で定義
