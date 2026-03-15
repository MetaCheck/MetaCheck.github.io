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

async function submitAddPatient() {
  const id      = document.getElementById('new-patient-id')?.value.trim();
  const sex     = document.getElementById('new-patient-sex')?.value;
  const age     = document.getElementById('new-patient-age')?.value;
  const country = document.getElementById('new-patient-country')?.value.trim();
  const disease = document.getElementById('new-patient-disease')?.value.trim();

  if (!id) { showToast('患者IDを入力してください', 'error'); return; }
  if (!currentUser?.clinicId) return;

  try {
    await insertPatient({
      id, sex, age: age ? parseInt(age) : null,
      country, disease, clinic_id: currentUser.clinicId
    });
    closeModal('modal-add-patient');
    showToast('患者を追加しました', 'success');
    // リスト更新
    allPatients = await fetchPatientsByClinic(currentUser.clinicId);
    renderPatientList(allPatients);
  } catch (e) {
    showToast('追加に失敗しました', 'error');
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

// ─── 言語切替（トップバー内） ──────────

function buildLangSwitcher(containerId, isDark = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.className = `lang-switcher${isDark ? '' : ' lang-switcher--dark'}`;

  const btn = document.createElement('button');
  btn.className = 'lang-switcher__btn';
  btn.textContent = (currentLang || 'ja').toUpperCase();
  btn.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  };

  const dropdown = document.createElement('div');
  dropdown.className = 'lang-switcher__dropdown';
  ['ja','en','vi'].forEach(lang => {
    const opt = document.createElement('button');
    opt.className = `lang-switcher__option${currentLang === lang ? ' active' : ''}`;
    opt.dataset.lang = lang;
    opt.textContent = lang.toUpperCase();
    opt.onclick = () => {
      changeLanguage(lang);
      dropdown.classList.remove('open');
      btn.textContent = lang.toUpperCase();
      dropdown.querySelectorAll('.lang-switcher__option').forEach(o => {
        o.classList.toggle('active', o.dataset.lang === lang);
      });
    };
    dropdown.appendChild(opt);
  });

  wrapper.appendChild(btn);
  wrapper.appendChild(dropdown);
  container.appendChild(wrapper);

  // 外クリックで閉じる
  document.addEventListener('click', () => dropdown.classList.remove('open'));
}

// ─── DOMContentLoaded ────────────────

document.addEventListener('DOMContentLoaded', () => {

  // 言語切替ウィジェット生成
  buildLangSwitcher('lang-switcher-patient', true);
  buildLangSwitcher('lang-switcher-clinic', false);

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
