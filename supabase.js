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

async function fetchPatientsByClinic(clinicId) {
  return dbSelect('patients', 'clinic_id=eq.' + clinicId + '&select=*&order=id');
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
  // category_resultsを全件取得してinsightsがあるものを探す
  const crRows = await dbSelect('category_results',
    'category=eq.' + encoded + '&select=id');
  if (!crRows.length) return null;
  for (var i = 0; i < crRows.length; i++) {
    const insights = await dbSelect('metabolite_insights',
      'category_result_id=eq.' + crRows[i].id + '&select=*&limit=1');
    if (insights.length) return insights[0];
  }
  return null;
}
