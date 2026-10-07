const SHEET_NAMES = {
  USERS: 'Users',
  TEACHERS: 'Teachers',
  SCHEDULE: 'Schedule',
  TODO: 'Todo',
  EVENTS: 'Events',
  CALENDAR: 'AcademicCalendar',
  SUBSTITUTIONS: 'Substitutions'
};

const HEADERS = {
  Users: ['id', 'email', 'name', 'photoUrl', 'role', 'createdAt', 'updatedAt'],
  Teachers: ['id', 'email', 'name', 'subject', 'status', 'createdAt', 'updatedAt'],
  Schedule: ['id', 'teacherEmail', 'day', 'startTime', 'endTime', 'className', 'topic', 'room', 'createdAt', 'updatedAt'],
  Todo: ['id', 'teacherEmail', 'title', 'description', 'dueAt', 'priority', 'done', 'createdAt', 'updatedAt'],
  Events: ['id', 'title', 'description', 'eventDate', 'startTime', 'endTime', 'type', 'createdBy', 'createdAt', 'updatedAt'],
  AcademicCalendar: ['id', 'date', 'title', 'type', 'description', 'isNationalHoliday', 'createdAt', 'updatedAt'],
  Substitutions: ['id', 'date', 'startTime', 'endTime', 'className', 'topic', 'room', 'absentTeacherEmail', 'substituteTeacherEmail', 'reason', 'status', 'createdBy', 'createdAt', 'updatedAt']
};

function doGet(e) {
  if (e && e.parameter && e.parameter.api === '1') return handleApi_(e);
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Math Up — Teacher Workspace').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  if (e && e.parameter && e.parameter.api === '1') return handleApi_(e);
  return ContentService.createTextOutput(JSON.stringify({ok:false,error:'API tidak valid.'})).setMimeType(ContentService.MimeType.JSON);
}

function handleApi_(e) {
  const action = String((e.parameter && e.parameter.action) || '');
  const callback = String((e.parameter && e.parameter.callback) || '');
  let args = [];
  try {
    const raw = e.parameter && e.parameter.payload;
    args = raw ? JSON.parse(raw) : [];
  } catch (err) {
    return apiResponse_({ok:false,error:'Payload tidak valid.'}, callback);
  }
  const allowed = {
    getBootstrap:'getBootstrap', getCurrentUser:'getCurrentUser',
    getSubstitutionRequests:'getSubstitutionRequests', getDriveMaterials:'getDriveMaterials',
    getEffectiveSchedule:'getEffectiveSchedule', saveTodo:'saveTodo', toggleTodo:'toggleTodo',
    saveTeacher:'saveTeacher', saveSchedule:'saveSchedule', saveEvent:'saveEvent',
    findSubstituteCandidates:'findSubstituteCandidates', saveSubstitution:'saveSubstitution',
    respondSubstitution:'respondSubstitution'
  };
  try {
    if (!allowed[action] || typeof this[allowed[action]] !== 'function') throw new Error('API action tidak diizinkan.');
    const result = this[allowed[action]].apply(null, Array.isArray(args) ? args : [args]);
    return apiResponse_(result, callback);
  } catch (err) {
    return apiResponse_({ok:false,error:err && err.message ? err.message : String(err)}, callback);
  }
}

function apiResponse_(payload, callback) {
  const body = JSON.stringify(payload && payload.ok === false ? payload : {ok:true,data:payload});
  if (callback) return ContentService.createTextOutput(callback + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupSheets() {
  const ss = getSpreadsheet_();
  Object.keys(HEADERS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const expected = HEADERS[name];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
      sheet.setFrozenRows(1);
    }
  });
  return { ok: true, sheets: Object.keys(HEADERS) };
}

function getBootstrap() {
  const user = requireUser_();
  setupSheets();
  upsertUser_(user);
  const allSchedule = readRows_(SHEET_NAMES.SCHEDULE); const approvedSubs = readRows_(SHEET_NAMES.SUBSTITUTIONS).filter(r => String(r.status || '') === 'Disetujui'); const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd'); const effectiveSchedule = buildEffectiveSchedule_(allSchedule, approvedSubs, today);
  return {
    ok: true,
    user,
    todos: readRows_(SHEET_NAMES.TODO).filter(r => r.teacherEmail === user.email),
    schedule: effectiveSchedule.filter(r => String(r.teacherEmail).toLowerCase() === user.email),
    allSchedule,
    events: readRows_(SHEET_NAMES.EVENTS),
    teachers: readRows_(SHEET_NAMES.TEACHERS),
    academicCalendar: readRows_(SHEET_NAMES.CALENDAR),
    substitutions: readRows_(SHEET_NAMES.SUBSTITUTIONS).filter(r => String(r.status || 'Diajukan') !== 'Ditolak')
  };
}

function saveTodo(todo) {
  const user = requireUser_();
  setupSheets();
  return upsertRow_(SHEET_NAMES.TODO, {
    id: todo.id || Utilities.getUuid(), teacherEmail: user.email, title: String(todo.title || '').trim(),
    description: String(todo.description || ''), dueAt: String(todo.dueAt || ''), priority: todo.priority || 'Sedang',
    done: Boolean(todo.done), createdAt: todo.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
  });
}

function toggleTodo(id, done) {
  const user = requireUser_();
  const row = findRow_(SHEET_NAMES.TODO, id);
  if (!row || row.data.teacherEmail !== user.email) throw new Error('Tugas tidak ditemukan.');
  return updateRow_(SHEET_NAMES.TODO, row.rowNumber, {...row.data, done: Boolean(done), updatedAt: new Date().toISOString()});
}

function saveTeacher(teacher) {
  const user = requireUser_();
  if (String(teacher.email || '').trim().toLowerCase() !== user.email) throw new Error('Guru hanya dapat memperbarui profilnya sendiri.');
  setupSheets();
  return upsertRow_(SHEET_NAMES.TEACHERS, {
    id: teacher.id || Utilities.getUuid(), email: user.email, name: String(teacher.name || '').trim(),
    subject: String(teacher.subject || 'Matematika'), status: teacher.status || 'Aktif',
    createdAt: teacher.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
  });
}

function saveSchedule(item) {
  const user = requireUser_();
  setupSheets();
  if (item.teacherEmail && String(item.teacherEmail).toLowerCase() !== user.email) throw new Error('Jadwal harus dimiliki oleh akun yang sedang aktif.');
  return upsertRow_(SHEET_NAMES.SCHEDULE, {
    id: item.id || Utilities.getUuid(), teacherEmail: user.email, day: String(item.day || ''),
    startTime: String(item.startTime || ''), endTime: String(item.endTime || ''), className: String(item.className || ''),
    topic: String(item.topic || ''), room: String(item.room || ''), createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function saveEvent(event) {
  const user = requireUser_();
  setupSheets();
  return upsertRow_(SHEET_NAMES.EVENTS, {
    id: event.id || Utilities.getUuid(), title: String(event.title || '').trim(), description: String(event.description || ''),
    eventDate: String(event.eventDate || ''), startTime: String(event.startTime || ''), endTime: String(event.endTime || ''),
    type: event.type || 'Sekolah', createdBy: user.email, createdAt: event.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function findSubstituteCandidates(request) {
  const user = requireUser_();
  setupSheets();
  const date = String(request.date || '').trim();
  const startTime = String(request.startTime || '').trim();
  const endTime = String(request.endTime || '').trim();
  if (!date || !startTime || !endTime) throw new Error('Tanggal, jam mulai, dan jam selesai wajib diisi.');
  if (timeToMinutes_(startTime) >= timeToMinutes_(endTime)) throw new Error('Jam selesai harus setelah jam mulai.');

  const absentEmail = String(request.absentTeacherEmail || user.email).trim().toLowerCase();
  if (absentEmail !== user.email) throw new Error('Guru hanya dapat mencari pengganti untuk jadwalnya sendiri.');

  const day = String(request.day || dayNameId_(date));
  const schedules = readRows_(SHEET_NAMES.SCHEDULE);
  const events = readRows_(SHEET_NAMES.EVENTS);
  const teachers = readRows_(SHEET_NAMES.TEACHERS).filter(t => String(t.status || 'Aktif').toLowerCase() !== 'nonaktif');

  return teachers.filter(t => String(t.email).toLowerCase() !== absentEmail).map(t => {
    const teacherEmail = String(t.email).toLowerCase();
    const conflicts = schedules.filter(s =>
      String(s.teacherEmail).toLowerCase() === teacherEmail &&
      String(s.day).toLowerCase() === day.toLowerCase() &&
      overlaps_(s.startTime, s.endTime, startTime, endTime)
    );
    const dayLoad = schedules.filter(s =>
      String(s.teacherEmail).toLowerCase() === teacherEmail &&
      String(s.day).toLowerCase() === day.toLowerCase()
    ).length;
    const agendaConflicts = events.filter(e =>
      String(e.eventDate) === date &&
      String(e.startTime || '') &&
      overlaps_(e.startTime, e.endTime || e.startTime, startTime, endTime)
    );
    return {
      email: teacherEmail, name: t.name || teacherEmail.split('@')[0], subject: t.subject || 'Matematika',
      status: conflicts.length ? 'Tidak tersedia' : (agendaConflicts.length ? 'Perlu dicek' : 'Tersedia'),
      conflicts, agendaConflicts, dailyLoad
    };
  }).sort((a, b) => {
    const rank = { 'Tersedia': 0, 'Perlu dicek': 1, 'Tidak tersedia': 2 };
    return rank[a.status] - rank[b.status] || a.dailyLoad - b.dailyLoad || a.name.localeCompare(b.name);
  });
}

function saveSubstitution(item) {
  const user = requireUser_();
  setupSheets();
  const absentEmail = String(item.absentTeacherEmail || user.email).trim().toLowerCase();
  const substituteEmail = String(item.substituteTeacherEmail || '').trim().toLowerCase();
  if (absentEmail !== user.email) throw new Error('Pengajuan hanya dapat dibuat oleh guru yang izin.');
  if (!substituteEmail || substituteEmail === absentEmail) throw new Error('Guru pengganti tidak valid.');

  const candidates = findSubstituteCandidates({
    date: item.date, startTime: item.startTime, endTime: item.endTime, absentTeacherEmail: absentEmail
  });
  const candidate = candidates.find(c => c.email === substituteEmail);
  if (!candidate) throw new Error('Guru pengganti tidak ditemukan.');
  if (candidate.status === 'Tidak tersedia') throw new Error('Guru tersebut memiliki jadwal bentrok.');

  return upsertRow_(SHEET_NAMES.SUBSTITUTIONS, {
    id: item.id || Utilities.getUuid(), date: String(item.date || ''), startTime: String(item.startTime || ''),
    endTime: String(item.endTime || ''), className: String(item.className || ''), topic: String(item.topic || ''),
    room: String(item.room || ''), absentTeacherEmail: absentEmail, substituteTeacherEmail: substituteEmail,
    reason: String(item.reason || ''), status: item.status || 'Diajukan', createdBy: user.email,
    createdAt: item.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
  });
}




function buildEffectiveSchedule_(schedules, substitutions, targetDate) {
  const base = schedules.map(s => ({...s, scheduleType: 'Reguler', originalTeacherEmail: s.teacherEmail}));
  const date = String(targetDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd'));
  substitutions.filter(sub => String(sub.date) === date).forEach(sub => {
    const absent = String(sub.absentTeacherEmail || '').toLowerCase();
    const substitute = String(sub.substituteTeacherEmail || '').toLowerCase();
    const day = dayNameId_(String(sub.date || ''));
    const matching = schedules.filter(s =>
      String(s.teacherEmail).toLowerCase() === absent &&
      String(s.day).toLowerCase() === day.toLowerCase() &&
      String(s.startTime) === String(sub.startTime) &&
      String(s.endTime) === String(sub.endTime) &&
      (!sub.className || String(s.className) === String(sub.className))
    );
    const source = matching.length ? matching : [{
      id: 'sub-' + sub.id, day, startTime: sub.startTime, endTime: sub.endTime,
      className: sub.className, topic: sub.topic, room: sub.room
    }];
    source.forEach(s => base.push({
      ...s,
      id: String(s.id) + '-sub-' + sub.id,
      teacherEmail: substitute,
      originalTeacherEmail: absent,
      scheduleType: 'Pengganti',
      substitutionId: sub.id,
      substitutionDate: sub.date,
      substitutionStatus: sub.status,
      substituteFor: absent
    }));
  });
  return base;
}

function getEffectiveSchedule(date) {
  requireUser_();
  setupSheets();
  const targetDate = String(date || '').trim();
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(targetDate)) throw new Error('Format tanggal tidak valid.');
  const schedules = readRows_(SHEET_NAMES.SCHEDULE);
  const approvedSubs = readRows_(SHEET_NAMES.SUBSTITUTIONS).filter(r => String(r.status || '') === 'Disetujui');
  return buildEffectiveSchedule_(schedules, approvedSubs, targetDate);
}

function getSubstitutionRequests() {
  const user = requireUser_();
  setupSheets();
  return readRows_(SHEET_NAMES.SUBSTITUTIONS).filter(r =>
    String(r.substituteTeacherEmail || '').toLowerCase() === user.email &&
    String(r.status || 'Diajukan') === 'Diajukan'
  );
}

function respondSubstitution(id, response) {
  const user = requireUser_();
  setupSheets();
  const row = findRow_(SHEET_NAMES.SUBSTITUTIONS, id);
  if (!row) throw new Error('Permintaan pergantian tidak ditemukan.');
  const substituteEmail = String(row.data.substituteTeacherEmail || '').toLowerCase();
  if (substituteEmail !== user.email) throw new Error('Hanya guru yang ditunjuk yang dapat merespons permintaan ini.');

  const action = String(response || '').toLowerCase();
  if (action !== 'terima' && action !== 'tolak') throw new Error('Respons tidak valid.');
  const status = action === 'terima' ? 'Disetujui' : 'Ditolak';

  return updateRow_(SHEET_NAMES.SUBSTITUTIONS, row.rowNumber, {
    ...row.data,
    status,
    updatedAt: new Date().toISOString()
  });
}

function getCurrentUser() {
  return requireUser_();
}

function requireUser_() {
  const email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Akun Google aktif tidak tersedia. Periksa pengaturan akses web app.');
  return { email: email.toLowerCase(), name: email.split('@')[0], photoUrl: '', role: 'Guru' };
}

function upsertUser_(user) {
  const existing = readRows_(SHEET_NAMES.USERS).find(r => r.email === user.email);
  const now = new Date().toISOString();
  upsertRow_(SHEET_NAMES.USERS, {
    id: existing ? existing.id : Utilities.getUuid(), email: user.email, name: user.name, photoUrl: '',
    role: existing ? existing.role : 'Guru', createdAt: existing ? existing.createdAt : now, updatedAt: now
  });
  if (!readRows_(SHEET_NAMES.TEACHERS).some(r => r.email === user.email)) {
    upsertRow_(SHEET_NAMES.TEACHERS, {
      id: Utilities.getUuid(), email: user.email, name: user.name, subject: 'Matematika', status: 'Aktif',
      createdAt: now, updatedAt: now
    });
  }
}

function setDriveFolderId(id) {
  if (!id) throw new Error('Drive Folder ID wajib diisi.');
  DriveApp.getFolderById(String(id).trim());
  PropertiesService.getScriptProperties().setProperty('DRIVE_FOLDER_ID', String(id).trim());
  return { ok: true };
}

function getDriveMaterials() {
  requireUser_();
  const id = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  if (!id) return { configured: false, folderName: '', folderUrl: '', files: [] };
  const folder = DriveApp.getFolderById(id);
  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    files.push({id:f.getId(),name:f.getName(),mimeType:f.getMimeType(),size:f.getSize(),updatedAt:f.getLastUpdated().toISOString(),url:f.getUrl()});
  }
  files.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  return {configured:true,folderName:folder.getName(),folderUrl:folder.getUrl(),files};
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID belum diatur. Jalankan setSpreadsheetId("ID_SHEET").');
  return SpreadsheetApp.openById(id);
}

function setSpreadsheetId(id) {
  if (!id) throw new Error('Spreadsheet ID wajib diisi.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', String(id).trim());
  return { ok: true };
}

function dayNameId_(dateString) {
  const parts = String(dateString).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error('Format tanggal tidak valid.');
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][d.getDay()];
}

function timeToMinutes_(value) {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

function overlaps_(startA, endA, startB, endB) {
  const a1 = timeToMinutes_(startA), a2 = timeToMinutes_(endA);
  const b1 = timeToMinutes_(startB), b2 = timeToMinutes_(endB);
  return [a1, a2, b1, b2].every(Number.isFinite) && a1 < b2 && a2 > b1;
}

function readRows_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values.shift();
  return values.filter(row => row.some(cell => cell !== '')).map(row => headers.reduce((obj, key, i) => { obj[key] = row[i]; return obj; }, {}));
}

function findRow_(sheetName, id) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values.shift();
  const idIndex = headers.indexOf('id');
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      return {rowNumber: i + 2, data: headers.reduce((obj, key, j) => { obj[key] = values[i][j]; return obj; }, {})};
    }
  }
  return null;
}

function upsertRow_(sheetName, data) {
  const existing = findRow_(sheetName, data.id);
  if (existing) return updateRow_(sheetName, existing.rowNumber, data);
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.appendRow(headers.map(key => data[key] ?? ''));
  return {ok: true, data};
}

function updateRow_(sheetName, rowNumber, data) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(key => data[key] ?? '')]);
  return {ok: true, data};
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
