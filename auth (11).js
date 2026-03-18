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
    // クリニックはデモ認証のまま（後で実装）
    const cid = document.getElementById('input-clinic-id')?.value.trim();
    const pw = document.getElementById('input-clinic-pw')?.value;
    if (!cid || pw !== 'demo1234') { showLoginError(true); return; }

    try {
      const clinics = await fetchClinics();
      const clinic = clinics.find(function(c) { return c.id === cid; });
      if (!clinic) { showLoginError(true); return; }

      currentUser = { role: 'clinic', id: cid, name: clinic.name, clinicId: cid };
      showLoginError(false);
      showScreen('screen-clinic');
      renderClinicPage(cid);
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
      await linkAnalysisId(userId, analysisId);
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
    'forgot': 'forgot-section'
  };
  ['login-section','register-section','check-email-section','link-analysis-section','forgot-section'].forEach(function(id) {
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
  document.getElementById('form-individual')?.classList.toggle('hidden', role !== 'individual');
  document.getElementById('form-clinic')?.classList.toggle('hidden', role !== 'clinic');
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

  document.getElementById('btn-show-register')?.addEventListener('click', function() {
    showRegisterSection('register');
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

  if (tokenHash && type) {
    fetch(SUPABASE_AUTH_URL + '/verify', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_hash: tokenHash, type: type })
    }).then(function(res) { return res.json(); }).then(function(data) {
      if (data.access_token) {
        currentAccessToken = data.access_token;
        const userId = data.user.id;

        // パスワードリセットの場合はパスワード変更画面へ
        if (type === 'recovery') {
          showScreen('screen-patient');
          // ダミーのcurrentUserをセット（パスワード変更のみ）
          currentUser = { role: 'individual', id: '—', userId: userId };
          // パスワード変更モーダルを開く
          setTimeout(function() {
            if (typeof openModal === 'function') openModal('modal-change-pw');
          }, 300);
          return;
        }

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
