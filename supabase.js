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

// 患者のカテゴリスコア取得
// patients.id → scores.patient_id（直接紐付き）
async function fetchScores(patientId) {
  return dbSelect('scores', `patient_id=eq.${patientId}&select=*&order=wavg_absfc.desc`);
}

// 患者のcategory_results取得
// patients.id → measurements.patient_id → category_results.measurement_id
async function fetchCategoryResults(patientId) {
  // まずmeasurementsから最新を取得
  const measurements = await dbSelect('measurements',
    `patient_id=eq.${patientId}&is_latest=eq.true&select=id&limit=1`);
  if (!measurements.length) return [];
  return dbSelect('category_results',
    `measurement_id=eq.${measurements[0].id}&select=*&order=wavg.desc`);
}

// クリニック一覧取得
async function fetchClinics() {
  return dbSelect('clinics', 'select=*&order=id');
}

// 患者追加
async function insertPatient(data) {
  return dbInsert('patients', data);
}

// カテゴリ名とpatient_idからmetabolite_insightsを取得
async function fetchInsightsByCategory(patientId, category) {
  // まずmeasurementsから最新IDを取得
  const measurements = await dbSelect('measurements',
    `patient_id=eq.${patientId}&is_latest=eq.true&select=id&limit=1`);
  
  // measurementsがない場合はcategory_resultsから直接カテゴリで検索
  let crRows = [];
  if (measurements.length) {
    crRows = await dbSelect('category_results',
      `measurement_id=eq.${measurements[0].id}&category=eq.${encodeURIComponent(category)}&select=id&limit=1`);
  }
  
  // category_resultsが見つからない場合はcategoryだけで検索
  if (!crRows.length) {
    crRows = await dbSelect('category_results',
      `category=eq.${encodeURIComponent(category)}&select=id&limit=1`);
  }
  
  if (!crRows.length) return null;
  
  const insights = await dbSelect('metabolite_insights',
    `category_result_id=eq.${crRows[0].id}&select=*&limit=1`);
  return insights[0] || null;
}
