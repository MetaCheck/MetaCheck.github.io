// ═══════════════════════════════════════════
//  supabase.js — DB接続・共通クエリ
// ═══════════════════════════════════════════

const SUPABASE_URL = 'https://fmpetihjnsuogbvnfauc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcGV0aWhqbnN1b2didm5mYXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTcyMDEsImV4cCI6MjA4NjkzMzIwMX0.OALF9p7TWQBPvoqE-E15wgBLKRVFSrc6S21mfrwVMk0';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json'
};

async function dbSelect(table, params) {
  const p = params || '';
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + p, { headers: HEADERS });
  if (!res.ok) throw new Error('DB error: ' + table);
  return res.json();
}

async function dbInsert(table, data) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'Prefer': 'return=representation' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Insert error: ' + table);
  return res.json();
}

async function dbUpsert(table, data) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: Object.assign({}, HEADERS, { 'Prefer': 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Upsert error: ' + table);
  return res.json();
}

// 複数解析IDのスコアを統合取得
async function fetchScoresMulti(patientIds) {
  if (!patientIds || !patientIds.length) return [];
  const idList = patientIds.map(function(id) { return '"' + id + '"'; }).join(',');
  return dbSelect('scores', 'patient_id=in.(' + idList + ')&select=*&order=measured_at.asc,wavg_absfc.desc');
}

async function fetchPatientsByClinic(clinicId) {
  return dbSelect('patients', 'clinic_id=eq.' + clinicId + '&select=*&order=id.desc');
}

async function fetchAllPatients() {
  return dbSelect('patients', 'select=*&order=id.desc');
}

async function fetchPatient(patientId) {
  const rows = await dbSelect('patients', 'id=eq.' + patientId + '&select=*');
  return rows[0] || null;
}

async function fetchScores(patientId) {
  return dbSelect('scores', 'patient_id=eq.' + patientId + '&select=*&order=wavg_absfc.desc');
}

async function fetchCategoryResults(patientId) {
  const measurements = await dbSelect('measurements',
    'patient_id=eq.' + patientId + '&is_latest=eq.true&select=id&limit=1');
  if (!measurements.length) return [];
  return dbSelect('category_results',
    'measurement_id=eq.' + measurements[0].id + '&select=*&order=wavg.desc');
}

async function fetchClinics() {
  return dbSelect('clinics', 'select=*&order=id');
}

async function insertPatient(data) {
  return dbInsert('patients', data);
}

async function fetchInsightsByCategory(patientId, category) {
  const encoded = category.split('').map(function(c) {
    if (c === ' ') return '%20';
    if (c === '/') return '%2F';
    return c;
  }).join('');
  const pidEncoded = patientId.split('').map(function(c) {
    if (c === ' ') return '%20';
    return c;
  }).join('');
  // patient_idとcategoryで直接検索
  const rows = await dbSelect('metabolite_insights',
    'patient_id=eq.' + pidEncoded + '&category=eq.' + encoded + '&select=*&limit=1');
  return rows[0] || null;
}

// ─── AI翻訳 ───────────────────────────────
const _translateCache = {};

async function translateText(text, targetLang) {
  if (!text || targetLang === 'ja') return text;
  const cacheKey = targetLang + ':' + text.slice(0, 50);
  if (_translateCache[cacheKey]) return _translateCache[cacheKey];

  const langNames = { en: 'English', vi: 'Vietnamese', cn: 'Chinese (Simplified)' };
  const langName = langNames[targetLang] || 'English';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: 'Translate the following Japanese medical text to ' + langName + '. Return only the translated text, no explanation:\n\n' + text
        }]
      })
    });
    const data = await res.json();
    const translated = data.content && data.content[0] && data.content[0].text ? data.content[0].text.trim() : text;
    _translateCache[cacheKey] = translated;
    return translated;
  } catch(e) {
    return text;
  }
}

// ─── AI要約 ───────────────────────────────
const _summarizeCache = {};

async function summarizeInsight(text, mode) {
  if (!text) return '<div style="color:var(--ink4);font-size:13px">データなし</div>';
  const cacheKey = mode + ':' + text.slice(0, 80);
  if (_summarizeCache[cacheKey]) return _summarizeCache[cacheKey];

  const prompt = mode === 'clinic'
    ? '以下の臨床解釈・介入テキストを、医師向けに3〜5箇条で簡潔に要約してください。箇条書き（•）で返してください。余分な前置きは不要です。\n\n' + text
    : '以下の患者向けコメントを、患者が理解しやすい言葉で2〜3文に要約してください。優しいトーンで。余分な前置きは不要です。\n\n' + text;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const raw = data.content && data.content[0] ? data.content[0].text.trim() : text;
    // 改行を<br>に変換
    const html = raw.replace(/\n/g, '<br>');
    _summarizeCache[cacheKey] = html;
    return html;
  } catch(e) {
    // APIエラー時はそのまま表示
    return text.replace(/\n/g, '<br>');
  }
}

// ─── Supabase Auth ────────────────────────
const SUPABASE_AUTH_URL = SUPABASE_URL + '/auth/v1';

// メール＋PW でサインアップ
async function authSignUp(email, password, redirectTo, role) {
  const body = { email: email, password: password };
  const opts = {};
  if (redirectTo) opts.emailRedirectTo = redirectTo;
  if (role) opts.data = { role: role };
  if (Object.keys(opts).length) body.options = opts;
  const res = await fetch(SUPABASE_AUTH_URL + '/signup', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || '登録に失敗しました');
  return data;
}

// メール＋PW でサインイン
async function authSignIn(email, password) {
  const res = await fetch(SUPABASE_AUTH_URL + '/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || 'ログインに失敗しました');
  return data; // { access_token, user, ... }
}

// 解析IDとユーザーを紐付け
async function linkAnalysisId(userId, analysisId, email) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/user_analysis_ids', {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify({ user_id: userId, patient_id: analysisId, email: email || null })
  });
  if (!res.ok) throw new Error('解析IDの紐付けに失敗しました');
  return res.json();
}

// メールアドレスから紐付く全解析IDを取得（クリニック用）
async function getAnalysisIdsByEmail(email) {
  const encoded = email.split('').map(function(c) {
    if (c === '@') return '%40';
    if (c === '+') return '%2B';
    if (c === '.') return '.';
    return c;
  }).join('');
  return dbSelect('user_analysis_ids', 'email=eq.' + encoded + '&select=patient_id,linked_at&order=linked_at.asc');
}

// ユーザーIDから紐付く全解析IDを取得
async function getAnalysisIds(userId) {
  return dbSelect('user_analysis_ids', 'user_id=eq.' + userId + '&select=patient_id,linked_at,email&order=linked_at.asc');
}
