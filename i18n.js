// ═══════════════════════════════════════════
//  i18n.js — 多言語（JA/EN/VI）
// ═══════════════════════════════════════════

const I18N = {
  ja: {
    'login.subtitle':      'Metabolic Intelligence Platform',
    'login.patient':       '患者',
    'login.clinic':        'クリニック',
    'login.patientId':     '患者ID',
    'login.clinicId':      'クリニックID',
    'login.password':      'パスワード',
    'login.submit':        'ログイン',
    'login.error':         'IDまたはパスワードが正しくありません',
    'login.demo':          '※ デモ環境 / パスワード: demo1234',
    'patient.mypage':      'マイページ',
    'patient.scoreOverview':'代謝スコア一覧',
    'patient.cta.title':   '気になることがあれば',
    'patient.cta.sub':     '担当クリニックにご相談ください',
    'patient.requestAnalysis': '解析依頼',
    'clinic.portal':       'クリニックポータル',
    'clinic.searchPlaceholder': '患者IDを検索...',
    'clinic.addPatient':   '＋ 患者追加',
    'clinic.uploadExcel':  '📊 Excel投入',
    'clinic.selectPatient':'患者を選択してください',
    'clinic.selectPatientSub': '左のリストから患者を選択すると詳細が表示されます',
    'clinic.compare':      '比較',
    'clinic.export':       'レポート出力',
    'clinic.memo':         '📝 クリニックメモ',
    'clinic.memoPlaceholder': '患者へのメモ・指示事項...',
    'clinic.memoSaved':    '保存しました ✓',
    'request.title':       '解析依頼',
    'request.type':        '依頼種別',
    'request.typeNew':     '新規測定',
    'request.typeRecheck': '再検査',
    'request.typeConsult': '相談',
    'request.message':     'メッセージ',
    'request.messagePlaceholder': '気になる症状や質問を入力...',
    'request.submit':      '依頼を送る',
    'upload.title':        'Excelデータ投入',
    'upload.dropzone':     'Excelファイルをドロップ、またはクリックして選択',
    'upload.hint':         'Metabo_DWH_*.xlsx 形式',
    'upload.preview':      '確認',
    'upload.confirm':      '投入開始',
    'addPatient.title':    '患者追加',
    'addPatient.id':       '患者ID',
    'addPatient.sex':      '性別',
    'addPatient.age':      '年齢',
    'addPatient.country':  '国籍',
    'addPatient.disease':  '疾患・メモ',
    'addPatient.submit':   '追加',
    'common.logout':       'ログアウト',
    'common.cancel':       'キャンセル',
    'rank.label':          'ランク',
    'score.worst':         '最も要注意',
    'score.best':          '最も良好',
  },
  en: {
    'login.subtitle':      'Metabolic Intelligence Platform',
    'login.patient':       'Patient',
    'login.clinic':        'Clinic',
    'login.patientId':     'Patient ID',
    'login.clinicId':      'Clinic ID',
    'login.password':      'Password',
    'login.submit':        'Login',
    'login.error':         'Invalid ID or password',
    'login.demo':          '※ Demo / Password: demo1234',
    'patient.mypage':      'My Page',
    'patient.scoreOverview':'Metabolic Score Overview',
    'patient.cta.title':   'Have a question?',
    'patient.cta.sub':     'Please consult your clinic',
    'patient.requestAnalysis': 'Request Analysis',
    'clinic.portal':       'Clinic Portal',
    'clinic.searchPlaceholder': 'Search patient ID...',
    'clinic.addPatient':   '＋ Add Patient',
    'clinic.uploadExcel':  '📊 Upload Excel',
    'clinic.selectPatient':'Select a patient',
    'clinic.selectPatientSub': 'Select a patient from the list to view details',
    'clinic.compare':      'Compare',
    'clinic.export':       'Export Report',
    'clinic.memo':         '📝 Clinic Memo',
    'clinic.memoPlaceholder': 'Notes for patient...',
    'clinic.memoSaved':    'Saved ✓',
    'request.title':       'Request Analysis',
    'request.type':        'Request Type',
    'request.typeNew':     'New Measurement',
    'request.typeRecheck': 'Recheck',
    'request.typeConsult': 'Consultation',
    'request.message':     'Message',
    'request.messagePlaceholder': 'Enter symptoms or questions...',
    'request.submit':      'Send Request',
    'upload.title':        'Upload Excel Data',
    'upload.dropzone':     'Drop Excel file here or click to select',
    'upload.hint':         'Metabo_DWH_*.xlsx format',
    'upload.preview':      'Preview',
    'upload.confirm':      'Start Upload',
    'addPatient.title':    'Add Patient',
    'addPatient.id':       'Patient ID',
    'addPatient.sex':      'Sex',
    'addPatient.age':      'Age',
    'addPatient.country':  'Country',
    'addPatient.disease':  'Disease / Notes',
    'addPatient.submit':   'Add',
    'common.logout':       'Logout',
    'common.cancel':       'Cancel',
    'rank.label':          'Rank',
    'score.worst':         'Most Concern',
    'score.best':          'Best',
  },
  vi: {
    'login.subtitle':      'Nền tảng Phân tích Chuyển hóa',
    'login.patient':       'Bệnh nhân',
    'login.clinic':        'Phòng khám',
    'login.patientId':     'Mã bệnh nhân',
    'login.clinicId':      'Mã phòng khám',
    'login.password':      'Mật khẩu',
    'login.submit':        'Đăng nhập',
    'login.error':         'ID hoặc mật khẩu không đúng',
    'login.demo':          '※ Demo / Mật khẩu: demo1234',
    'patient.mypage':      'Trang cá nhân',
    'patient.scoreOverview':'Tổng quan điểm chuyển hóa',
    'patient.cta.title':   'Có thắc mắc?',
    'patient.cta.sub':     'Vui lòng hỏi phòng khám của bạn',
    'patient.requestAnalysis': 'Yêu cầu phân tích',
    'clinic.portal':       'Cổng phòng khám',
    'clinic.searchPlaceholder': 'Tìm mã bệnh nhân...',
    'clinic.addPatient':   '＋ Thêm bệnh nhân',
    'clinic.uploadExcel':  '📊 Tải Excel',
    'clinic.selectPatient':'Chọn bệnh nhân',
    'clinic.selectPatientSub': 'Chọn bệnh nhân từ danh sách để xem chi tiết',
    'clinic.compare':      'So sánh',
    'clinic.export':       'Xuất báo cáo',
    'clinic.memo':         '📝 Ghi chú phòng khám',
    'clinic.memoPlaceholder': 'Ghi chú cho bệnh nhân...',
    'clinic.memoSaved':    'Đã lưu ✓',
    'request.title':       'Yêu cầu phân tích',
    'request.type':        'Loại yêu cầu',
    'request.typeNew':     'Đo mới',
    'request.typeRecheck': 'Kiểm tra lại',
    'request.typeConsult': 'Tư vấn',
    'request.message':     'Tin nhắn',
    'request.messagePlaceholder': 'Nhập triệu chứng hoặc câu hỏi...',
    'request.submit':      'Gửi yêu cầu',
    'upload.title':        'Tải dữ liệu Excel',
    'upload.dropzone':     'Thả file Excel vào đây hoặc nhấp để chọn',
    'upload.hint':         'Định dạng Metabo_DWH_*.xlsx',
    'upload.preview':      'Xem trước',
    'upload.confirm':      'Bắt đầu tải',
    'addPatient.title':    'Thêm bệnh nhân',
    'addPatient.id':       'Mã bệnh nhân',
    'addPatient.sex':      'Giới tính',
    'addPatient.age':      'Tuổi',
    'addPatient.country':  'Quốc gia',
    'addPatient.disease':  'Bệnh / Ghi chú',
    'addPatient.submit':   'Thêm',
    'common.logout':       'Đăng xuất',
    'common.cancel':       'Hủy',
    'rank.label':          'Hạng',
    'score.worst':         'Cần chú ý nhất',
    'score.best':          'Tốt nhất',
  }
};

let currentLang = 'ja';

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N['ja'][key] || key;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // html lang属性更新
  document.documentElement.lang = currentLang;
}

function changeLanguage(lang) {
  currentLang = lang;
  applyI18n();
  // ボタンのactive状態更新
  document.querySelectorAll('.lang-pill, .lang-switcher__option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  // 現在の言語表示更新
  document.querySelectorAll('.lang-switcher__btn').forEach(btn => {
    btn.textContent = lang.toUpperCase();
  });
  localStorage.setItem('lang', lang);
}

// ページ読み込み時に保存された言語を適用
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('lang') || 'ja';
  changeLanguage(saved);
});
