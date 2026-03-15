// ═══════════════════════════════════════════
//  supabase.js — DB接続・共通クエリ（100行以内）
// ═══════════════════════════════════════════

const SUPABASE_URL = 'https://fmpetihjnsuogbvnfauc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcGV0aWhqbnN1b2didm5mYXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTcyMDEsImV4cCI6MjA4NjkzMzIwMX0.OALF9p7TWQBPvoqE-E15wgBLKRVFSrc6S21mfrwVMk0';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json'
};

// 汎用SELECT
async function dbSelect(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`DB error: ${table}`);
  return res.json();
}

// 汎用INSERT
async function dbInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Insert error: ${table}`);
  return res.json();
}

// 汎用UPSERT
async function dbUpsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Upsert error: ${table}`);
  return res.json();
}

// ─── 患者関連クエリ ───────────────────────

// クリニックIDで患者一覧取得
async function fetchPatientsByClinic(clinicId) {
  return dbSelect('patients', `clinic_id=eq.${clinicId}&select=*&order=id`);
}

// 患者IDで患者1件取得
async function fetchPatient(patientId) {
  const rows = await dbSelect('patients', `id=eq.${patientId}&select=*`);
  return rows[0] || null;
}

// 患者の最新measurement取得
async function fetchLatestMeasurement(patientId) {
  const rows = await dbSelect('measurements',
    `patient_id=eq.${patientId}&is_latest=eq.true&select=*&order=measurement_date.desc&limit=1`);
  return rows[0] || null;
}

// measurement_idでカテゴリスコア取得
async function fetchCategoryResults(measurementId) {
  return dbSelect('category_results',
    `measurement_id=eq.${measurementId}&select=*&order=wavg.desc`);
}

// 患者スコア取得（measurements → category_results）
async function fetchScores(patientId) {
  const m = await fetchLatestMeasurement(patientId);
  if (!m) return [];
  return fetchCategoryResults(m.id);
}

// クリニック一覧取得
async function fetchClinics() {
  return dbSelect('clinics', 'select=*&order=id');
}

// 患者追加
async function insertPatient(data) {
  return dbInsert('patients', data);
}
