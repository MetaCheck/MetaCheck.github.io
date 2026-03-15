// ═══════════════════════════════════════════
//  auth.js — 認証（Supabaseベース）
// ═══════════════════════════════════════════

// 現在のセッション
let currentUser = null; // { role:'patient'|'clinic', id, name, clinicId }

// ─── ログイン ────────────────────────────

async function doLogin() {
  const role = document.querySelector('.role-tab.active')?.dataset.role || 'patient';
  const pw = document.getElementById(role === 'patient' ? 'input-patient-pw' : 'input-clinic-pw')?.value;

  // パスワードチェック（暫定）
  if (pw !== 'demo1234') {
    showLoginError(true);
    return;
  }
  showLoginError(false);

  if (role === 'patient') {
    const pid = document.getElementById('input-patient-id')?.value.trim();
    if (!pid) { showLoginError(true); return; }

    try {
      const patient = await fetchPatient(pid);
      if (!patient) { showLoginError(true); return; }

      currentUser = { role: 'patient', id: pid, name: pid, clinicId: patient.clinic_id };
      showScreen('screen-patient');
      renderPatientPage(patient);
    } catch (e) {
      console.error(e);
      showLoginError(true);
    }

  } else {
    const cid = document.getElementById('input-clinic-id')?.value.trim();
    if (!cid) { showLoginError(true); return; }

    try {
      const clinics = await fetchClinics();
      const clinic = clinics.find(c => c.id === cid);
      if (!clinic) { showLoginError(true); return; }

      currentUser = { role: 'clinic', id: cid, name: clinic.name, clinicId: cid };
      showScreen('screen-clinic');
      renderClinicPage(cid);
    } catch (e) {
      console.error(e);
      showLoginError(true);
    }
  }
}

function doLogout() {
  currentUser = null;
  showScreen('screen-login');
  // 入力クリア
  ['input-patient-id','input-patient-pw','input-clinic-id','input-clinic-pw'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function showLoginError(show) {
  document.getElementById('login-error')?.classList.toggle('hidden', !show);
}

// ─── ロールタブ切替 ──────────────────────

function setRole(role) {
  document.querySelectorAll('.role-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });
  document.getElementById('form-patient')?.classList.toggle('hidden', role !== 'patient');
  document.getElementById('form-clinic')?.classList.toggle('hidden', role !== 'clinic');
}

// ─── 画面切替 ────────────────────────────

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
}

// ─── イベント登録 ────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // ログインボタン
  document.getElementById('btn-login')?.addEventListener('click', doLogin);

  // Enterキーでログイン
  ['input-patient-pw','input-clinic-pw'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  });

  // ロールタブ
  document.querySelectorAll('.role-tab').forEach(btn => {
    btn.addEventListener('click', () => setRole(btn.dataset.role));
  });

  // ログアウトボタン
  document.getElementById('btn-patient-logout')?.addEventListener('click', doLogout);
  document.getElementById('btn-clinic-logout')?.addEventListener('click', doLogout);

  // 言語ボタン（ログイン画面）
  document.querySelectorAll('.lang-pill').forEach(btn => {
    btn.addEventListener('click', () => changeLanguage(btn.dataset.lang));
  });
});
