// ═══════════════════════════════════════════
//  upload.js — Excelアップロード（150行以内）
// ═══════════════════════════════════════════
// 注意：実際のExcel解析はSheetJSライブラリが必要
// index.htmlに以下を追加:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

const uploadZone = () => document.getElementById('upload-zone');
const uploadInput = () => document.getElementById('upload-input');
const uploadPreview = () => document.getElementById('upload-preview');
const uploadStats = () => document.getElementById('upload-stats');
const uploadProgress = () => document.getElementById('upload-progress');
const uploadProgressFill = () => document.getElementById('upload-progress-fill');
const uploadProgressText = () => document.getElementById('upload-progress-text');
const btnConfirmUpload = () => document.getElementById('btn-confirm-upload');

let parsedUploadData = null;

// ─── ファイル選択・ドロップ ───────────────

function initUpload() {
  const zone = uploadZone();
  const input = uploadInput();
  if (!zone || !input) return;

  input.addEventListener('change', e => {
    if (e.target.files[0]) handleUploadFile(e.target.files[0]);
  });

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.style.borderColor = 'var(--sage)';
    zone.style.background = 'var(--foam)';
  });

  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = '';
    zone.style.background = '';
  });

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor = '';
    zone.style.background = '';
    if (e.dataTransfer.files[0]) handleUploadFile(e.dataTransfer.files[0]);
  });

  btnConfirmUpload()?.addEventListener('click', confirmUpload);
}

// ─── ファイル解析 ────────────────────────

async function handleUploadFile(file) {
  if (!file.name.match(/\.xlsx?$/i)) {
    showToast('Excelファイル(.xlsx)を選択してください', 'error');
    return;
  }

  if (typeof XLSX === 'undefined') {
    showToast('SheetJSライブラリが読み込まれていません', 'error');
    return;
  }

  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);

    // ScoresLongシートを確認
    const scoresSheet = wb.Sheets['ScoresLong'];
    const factSheet = wb.Sheets['Fact'];

    if (!scoresSheet && !factSheet) {
      showToast('ScoresLongまたはFactシートが見つかりません', 'error');
      return;
    }

    const scores = scoresSheet ? XLSX.utils.sheet_to_json(scoresSheet) : [];
    const facts = factSheet ? XLSX.utils.sheet_to_json(factSheet) : [];

    parsedUploadData = { scores, facts, filename: file.name };

    // プレビュー表示
    uploadPreview()?.classList.remove('hidden');
    if (uploadStats()) {
      uploadStats().innerHTML = `
        <div>📄 ファイル: <strong>${file.name}</strong></div>
        <div>📊 スコアデータ: <strong>${scores.length}行</strong></div>
        <div>🧬 生データ: <strong>${facts.length}行</strong></div>
      `;
    }
    btnConfirmUpload()?.classList.remove('hidden');

  } catch (e) {
    console.error(e);
    showToast('ファイルの読み込みに失敗しました', 'error');
  }
}

// ─── Supabaseへ投入 ──────────────────────

async function confirmUpload() {
  if (!parsedUploadData) return;

  const { scores, facts } = parsedUploadData;
  const progress = uploadProgress();
  const fill = uploadProgressFill();
  const text = uploadProgressText();

  progress?.classList.remove('hidden');
  btnConfirmUpload()?.setAttribute('disabled', true);

  try {
    // scoresをバッチ投入（100件ずつ）
    const batchSize = 100;
    for (let i = 0; i < scores.length; i += batchSize) {
      const batch = scores.slice(i, i + batchSize);
      await dbUpsert('scores', batch);
      const pct = Math.round(((i + batchSize) / scores.length) * 100);
      if (fill) fill.style.width = Math.min(pct, 100) + '%';
      if (text) text.textContent = `${Math.min(i + batchSize, scores.length)} / ${scores.length} 件処理中...`;
    }

    if (fill) fill.style.width = '100%';
    if (text) text.textContent = '完了！';
    showToast('データを投入しました', 'success');
    setTimeout(() => closeModal('modal-upload'), 1500);

  } catch (e) {
    console.error(e);
    showToast('投入に失敗しました', 'error');
  } finally {
    btnConfirmUpload()?.removeAttribute('disabled');
  }
}

// ─── 初期化 ──────────────────────────────

document.addEventListener('DOMContentLoaded', initUpload);
