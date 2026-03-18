// ═══════════════════════════════════════════
//  auth.js — 認証（Supabase Auth）
// ═══════════════════════════════════════════

let currentUser = null;
let currentAccessToken = null;

// ─── ログイン ────────────────────────────
async function doLogin() {
  const role = document.querySelector('.role-tab.active')?.dataset.role || 'individual';

  if (role === 'individual') {
    const email = document.getElementById('input-individual-email')?.value.trim();
    const pw = document.getElementById('input-individual-pw')?.value;
    if (!email || !pw) { showLoginError(true); return; }

    try {
      const session = await authSignIn(email, pw);
      currentAccessToken = session.access_token;
      const userId = session.user.id;

      // 紐付き解析IDを取得
      const links = await getAnalysisIds(userId);
      if (!links.length) {
        // 解析IDが未紐付けの場合は紐付け画面へ
        showRegisterSection('link-analysis');
        window._pendingUserId = userId;
        return;
      }

      // 最初の解析IDで患者データを取得
      const patientId = links[0].patient_id;
      const patient = await fetchPatient(patientId);
      if (!patient) { showLoginError(true); return; }

      currentUser = { role: 'individual', id: patientId, userId, email, allIds: links.map(l => l.patient_id) };
      showLoginError(false);
      showScreen('screen-patient');
      renderPatientPage(patient);

    } catch(e) {
      console.error(e);
      showLoginError(true);
    }

  } else {
    // クリニックはメール＋パスワードで認証
    const email = document.getElementById('input-clinic-email')?.value.trim();
    const pw = document.getElementById('input-clinic-pw')?.value;
    if (!email || !pw) { showLoginError(true); return; }

    try {
      const session = await authSignIn(email, pw);
      currentAccessToken = session.access_token;

      // メールからクリニック情報を取得
      const clinics = await dbSelect('clinics', 'email=eq.' + encodeURIComponent(email) + '&select=*');
      const clinic = clinics[0];
      if (!clinic) { showLoginError(true); return; }

      currentUser = { role: 'clinic', id: clinic.id, name: clinic.name, clinicId: clinic.id, status: clinic.status };
      showLoginError(false);
      showScreen('screen-clinic');
      renderClinicPage(clinic.id, clinic.status);
    } catch(e) {
      console.error(e);
      showLoginError(true);
    }
  }
}

// ─── 新規登録 ────────────────────────────
async function doRegister() {
  const email = document.getElementById('input-register-email')?.value.trim();
  const pw = document.getElementById('input-register-pw')?.value;
  const pw2 = document.getElementById('input-register-pw2')?.value;
  const analysisId = document.getElementById('input-register-analysis-id')?.value.trim().toUpperCase();
  const nickname = document.getElementById('input-register-nickname')?.value.trim();

  if (!email || !pw || !pw2 || !analysisId) {
    showRegisterError('全ての項目を入力してください');
    return;
  }
  if (pw !== pw2) {
    showRegisterError('パスワードが一致しません');
    return;
  }
  if (pw.length < 8) {
    showRegisterError('パスワードは8文字以上で設定してください');
    return;
  }

  // 解析IDが存在するか確認
  try {
    const patient = await fetchPatient(analysisId);
    if (!patient) {
      showRegisterError('解析IDが見つかりません。キットに記載のIDを確認してください');
      return;
    }
  } catch(e) {
    showRegisterError('解析IDの確認に失敗しました');
    return;
  }

  try {
    const result = await authSignUp(email, pw);
    const userId = result.user?.id;

    // 解析IDと紐付け
    if (userId) {
      await linkAnalysisId(userId, analysisId, email);
    }

    // ニックネームを patients テーブルに保存
    if (nickname) {
      await fetch(SUPABASE_URL + '/rest/v1/patients?id=eq.' + analysisId, {
        method: 'PATCH',
        headers: Object.assign({}, HEADERS, { 'Prefer': 'return=representation' }),
        body: JSON.stringify({ name: nickname })
      });
    }

    // 確認メール送信完了画面
    showRegisterSection('check-email');

  } catch(e) {
    showRegisterError(e.message || '登録に失敗しました');
  }
}

// ─── 解析ID紐付け ────────────────────────
async function doLinkAnalysisId() {
  const analysisId = document.getElementById('input-link-analysis-id')?.value.trim().toUpperCase();
  if (!analysisId || !window._pendingUserId) return;

  try {
    const patient = await fetchPatient(analysisId);
    if (!patient) {
      document.getElementById('link-error').textContent = '解析IDが見つかりません';
      return;
    }
    await linkAnalysisId(window._pendingUserId, analysisId);

    currentUser = { role: 'individual', id: analysisId, userId: window._pendingUserId, allIds: [analysisId] };
    showScreen('screen-patient');
    renderPatientPage(patient);
  } catch(e) {
    document.getElementById('link-error').textContent = e.message || '紐付けに失敗しました';
  }
}

// ─── クリニック新規登録 ──────────────────
async function doClinicRegister() {
  const name  = document.getElementById('input-clinic-reg-name')?.value.trim();
  const email = document.getElementById('input-clinic-reg-email')?.value.trim();
  const pw    = document.getElementById('input-clinic-reg-pw')?.value;
  const pw2   = document.getElementById('input-clinic-reg-pw2')?.value;
  const errEl = document.getElementById('clinic-register-error');

  if (!name || !email || !pw || !pw2) {
    if (errEl) { errEl.textContent = '全ての項目を入力してください'; errEl.classList.remove('hidden'); } return;
  }
  if (pw !== pw2) {
    if (errEl) { errEl.textContent = 'パスワードが一致しません'; errEl.classList.remove('hidden'); } return;
  }
  if (pw.length < 8) {
    if (errEl) { errEl.textContent = 'パスワードは8文字以上で設定してください'; errEl.classList.remove('hidden'); } return;
  }

  try {
    // Supabase Authに登録（クリニックフラグ付き）
    const redirectTo = window.location.origin + window.location.pathname + '?clinic=1';
    const result = await authSignUp(email, pw, redirectTo);
    const userId = result.user?.id;

    // クリニックIDを自動採番してclinicsテーブルに登録
    const idRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/generate_clinic_id', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({})
    });
    const clinicId = await idRes.json();

    await dbInsert('clinics', { id: clinicId, name: name, email: email, status: 'trial' });

    showRegisterSection('clinic-register-done');
  } catch(e) {
    if (errEl) { errEl.textContent = e.message || '登録に失敗しました'; errEl.classList.remove('hidden'); }
  }
}

// ─── パスワード忘れ ──────────────────────
async function doForgotPassword() {
  const email = document.getElementById('input-forgot-email')?.value.trim();
  const errEl = document.getElementById('forgot-error');
  const sucEl = document.getElementById('forgot-success');
  if (!email) {
    if (errEl) { errEl.textContent = 'メールアドレスを入力してください'; errEl.style.display = 'block'; }
    return;
  }
  try {
    const redirectTo = window.location.origin + window.location.pathname;
    await fetch(SUPABASE_AUTH_URL + '/recover', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, gotrue_meta_security: {}, redirect_to: redirectTo })
    });
    if (errEl) errEl.style.display = 'none';
    if (sucEl) sucEl.style.display = 'block';
  } catch(e) {
    if (errEl) { errEl.textContent = '送信に失敗しました'; errEl.style.display = 'block'; }
  }
}

// ─── パスワード変更 ──────────────────────
async function doChangePw() {
  const pw = document.getElementById('input-new-pw')?.value;
  const pw2 = document.getElementById('input-new-pw2')?.value;
  const errEl = document.getElementById('change-pw-error');
  if (!pw || !pw2) { if (errEl) { errEl.textContent = '全て入力してください'; errEl.style.display = 'block'; } return; }
  if (pw !== pw2) { if (errEl) { errEl.textContent = 'パスワードが一致しません'; errEl.style.display = 'block'; } return; }
  if (pw.length < 8) { if (errEl) { errEl.textContent = '8文字以上で設定してください'; errEl.style.display = 'block'; } return; }
  try {
    const res = await fetch(SUPABASE_AUTH_URL + '/user', {
      method: 'PUT',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + currentAccessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    if (!res.ok) throw new Error();
    closeModal('modal-change-pw');
    if (typeof showToast === 'function') showToast('パスワードを変更しました', 'success');
    document.getElementById('input-new-pw').value = '';
    document.getElementById('input-new-pw2').value = '';
    // パスワードリセット経由の場合はログアウトしてログイン画面へ
    setTimeout(function() { doLogout(); }, 1500);
  } catch(e) {
    if (errEl) { errEl.textContent = '変更に失敗しました。再ログインして試してください'; errEl.style.display = 'block'; }
  }
}

// ─── メールアドレス変更 ──────────────────
async function doChangeEmail() {
  const email = document.getElementById('input-new-email')?.value.trim();
  const errEl = document.getElementById('change-email-error');
  const sucEl = document.getElementById('change-email-success');
  if (!email) { if (errEl) { errEl.textContent = 'メールアドレスを入力してください'; errEl.style.display = 'block'; } return; }
  try {
    const res = await fetch(SUPABASE_AUTH_URL + '/user', {
      method: 'PUT',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + currentAccessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    if (!res.ok) throw new Error();
    if (errEl) errEl.style.display = 'none';
    if (sucEl) sucEl.style.display = 'block';
  } catch(e) {
    if (errEl) { errEl.textContent = '変更に失敗しました。再ログインして試してください'; errEl.style.display = 'block'; }
  }
}

// ─── ログアウト ──────────────────────────
function doLogout() {
  currentUser = null;
  currentAccessToken = null;
  window._pendingUserId = null;
  showScreen('screen-login');
  showRegisterSection('login');
  ['input-individual-email','input-individual-pw','input-clinic-id','input-clinic-pw',
   'input-register-email','input-register-pw','input-register-pw2','input-register-analysis-id'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ─── UI制御 ──────────────────────────────
function showLoginError(show) {
  document.getElementById('login-error')?.classList.toggle('hidden', !show);
}

function showRegisterError(msg) {
  const el = document.getElementById('register-error');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function showRegisterSection(section) {
  const map = {
    'login': 'login-section',
    'register': 'register-section',
    'check-email': 'check-email-section',
    'link-analysis': 'link-analysis-section',
    'forgot': 'forgot-section',
    'clinic-register': 'clinic-register-section',
    'clinic-register-done': 'clinic-register-done-section'
  };
  ['login-section','register-section','check-email-section','link-analysis-section','forgot-section','clinic-register-section','clinic-register-done-section'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.classList.add('hidden'); }
  });
  const target = document.getElementById(map[section]);
  if (target) { target.style.display = ''; target.classList.remove('hidden'); }
}

function setRole(role) {
  document.querySelectorAll('.role-tab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.role === role);
  });
  var formIndividual = document.getElementById('form-individual');
  var formClinic = document.getElementById('form-clinic');
  if (formIndividual) formIndividual.style.display = role === 'individual' ? '' : 'none';
  if (formClinic) formClinic.style.display = role === 'clinic' ? '' : 'none';
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(function(s) {
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
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btn-login')?.addEventListener('click', doLogin);
  document.getElementById('btn-register-submit')?.addEventListener('click', doRegister);
  document.getElementById('btn-link-analysis')?.addEventListener('click', doLinkAnalysisId);

  document.getElementById('btn-clinic-register-submit')?.addEventListener('click', doClinicRegister);
  document.getElementById('btn-back-from-clinic-register')?.addEventListener('click', function() {
    showRegisterSection('login');
  });
  document.getElementById('btn-back-from-clinic-done')?.addEventListener('click', function() {
    showRegisterSection('login');
  });

  document.getElementById('btn-show-register')?.addEventListener('click', function() {
    const role = document.querySelector('.role-tab.active')?.dataset.role || 'individual';
    if (role === 'clinic') {
      showRegisterSection('clinic-register');
    } else {
      showRegisterSection('register');
    }
  });
  document.getElementById('btn-show-forgot')?.addEventListener('click', function() {
    showRegisterSection('forgot');
  });
  document.getElementById('btn-forgot-submit')?.addEventListener('click', doForgotPassword);
  document.getElementById('btn-back-from-forgot')?.addEventListener('click', function() {
    showRegisterSection('login');
  });
  document.getElementById('btn-back-to-login')?.addEventListener('click', function() {
    showRegisterSection('login');
  });
  document.getElementById('btn-back-to-login2')?.addEventListener('click', function() {
    showRegisterSection('login');
  });

  ['input-individual-pw','input-clinic-pw'].forEach(function(id) {
    document.getElementById(id)?.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });
  });

  document.querySelectorAll('.role-tab').forEach(function(btn) {
    btn.addEventListener('click', function() { setRole(btn.dataset.role); });
  });

  document.getElementById('btn-patient-logout')?.addEventListener('click', doLogout);
  document.getElementById('btn-clinic-logout')?.addEventListener('click', doLogout);

  document.querySelectorAll('.lang-pill').forEach(function(btn) {
    btn.addEventListener('click', function() { changeLanguage(btn.dataset.lang); });
  });

  // メール確認リンクからのトークン処理
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const isClinic = params.get('clinic') === '1';

  if (tokenHash && type) {
    fetch(SUPABASE_AUTH_URL + '/verify', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_hash: tokenHash, type: type })
    }).then(function(res) { return res.json(); }).then(function(data) {
      if (data.access_token) {
        currentAccessToken = data.access_token;
        const userId = data.user.id;
        const userEmail = data.user.email;

        // パスワードリセット
        if (type === 'recovery') {
          showScreen('screen-patient');
          currentUser = { role: 'individual', id: '—', userId: userId };
          setTimeout(function() {
            if (typeof openModal === 'function') openModal('modal-change-pw');
          }, 300);
          return;
        }

        // クリニック登録確認
        if (isClinic) {
          dbSelect('clinics', 'email=eq.' + encodeURIComponent(userEmail) + '&select=*').then(function(clinics) {
            const clinic = clinics[0];
            if (!clinic) return;
            currentUser = { role: 'clinic', id: clinic.id, name: clinic.name, clinicId: clinic.id, status: clinic.status };
            showScreen('screen-clinic');
            renderClinicPage(clinic.id, clinic.status);
          });
          return;
        }

        // 個人登録確認
        getAnalysisIds(userId).then(function(links) {
          if (!links.length) {
            showRegisterSection('link-analysis');
            window._pendingUserId = userId;
            return;
          }
          const patientId = links[0].patient_id;
          fetchPatient(patientId).then(function(patient) {
            if (!patient) return;
            currentUser = { role: 'individual', id: patientId, userId: userId, allIds: links.map(function(l) { return l.patient_id; }) };
            showScreen('screen-patient');
            renderPatientPage(patient);
          });
        });
      }
    }).catch(function(e) { console.error(e); });
  }
});
