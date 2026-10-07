const SHEET_NAMES = {
  USERS: 'Users',
  TEACHERS: 'Teachers',
  SCHEDULE: 'Schedule',
  TODO: 'Todo',
  EVENTS: 'Events',
  CALENDAR: 'AcademicCalendar'
};

const HEADERS = {
  Users: ['id', 'email', 'name', 'photoUrl', 'role', 'createdAt', 'updatedAt'],
  Teachers: ['id', 'email', 'name', 'subject', 'status', 'createdAt', 'updatedAt'],
  Schedule: ['id', 'teacherEmail', 'day', 'startTime', 'endTime', 'className', 'topic', 'room', 'createdAt', 'updatedAt'],
  Todo: ['id', 'teacherEmail', 'title', 'description', 'dueAt', 'priority', 'done', 'createdAt', 'updatedAt'],
  Events: ['id', 'title', 'description', 'eventDate', 'startTime', 'endTime', 'type', 'createdBy', 'createdAt', 'updatedAt'],
  AcademicCalendar: ['id', 'date', 'title', 'type', 'description', 'isNationalHoliday', 'createdAt', 'updatedAt']
};

function doGet() {
  return json_({ ok: true, app: 'Math Up API', version: '1.0.0' });
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
  return {
    ok: true,
    user,
    todos: readRows_(SHEET_NAMES.TODO).filter(r => r.teacherEmail === user.email),
    schedule: readRows_(SHEET_NAMES.SCHEDULE).filter(r => r.teacherEmail === user.email),
    events: readRows_(SHEET_NAMES.EVENTS),
    teachers: readRows_(SHEET_NAMES.TEACHERS),
    academicCalendar: readRows_(SHEET_NAMES.CALENDAR)
  };
}

function saveTodo(todo) {
  const user = requireUser_();
  setupSheets();
  return upsertRow_(SHEET_NAMES.TODO, {
    id: todo.id || Utilities.getUuid(),
    teacherEmail: user.email,
    title: String(todo.title || '').trim(),
    description: String(todo.description || ''),
    dueAt: String(todo.dueAt || ''),
    priority: todo.priority || 'Sedang',
    done: Boolean(todo.done),
    createdAt: todo.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function toggleTodo(id, done) {
  const user = requireUser_();
  const row = findRow_(SHEET_NAMES.TODO, id);
  if (!row || row.data.teacherEmail !== user.email) throw new Error('Tugas tidak ditemukan.');
  return updateRow_(SHEET_NAMES.TODO, row.rowNumber, {
    ...row.data,
    done: Boolean(done),
    updatedAt: new Date().toISOString()
  });
}

function saveTeacher(teacher) {
  requireUser_();
  return upsertRow_(SHEET_NAMES.TEACHERS, {
    id: teacher.id || Utilities.getUuid(),
    email: String(teacher.email || '').trim().toLowerCase(),
    name: String(teacher.name || '').trim(),
    subject: String(teacher.subject || 'Matematika'),
    status: teacher.status || 'Aktif',
    createdAt: teacher.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function saveSchedule(item) {
  const user = requireUser_();
  return upsertRow_(SHEET_NAMES.SCHEDULE, {
    id: item.id || Utilities.getUuid(),
    teacherEmail: item.teacherEmail || user.email,
    day: String(item.day || ''),
    startTime: String(item.startTime || ''),
    endTime: String(item.endTime || ''),
    className: String(item.className || ''),
    topic: String(item.topic || ''),
    room: String(item.room || ''),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function saveEvent(event) {
  const user = requireUser_();
  return upsertRow_(SHEET_NAMES.EVENTS, {
    id: event.id || Utilities.getUuid(),
    title: String(event.title || '').trim(),
    description: String(event.description || ''),
    eventDate: String(event.eventDate || ''),
    startTime: String(event.startTime || ''),
    endTime: String(event.endTime || ''),
    type: event.type || 'Sekolah',
    createdBy: user.email,
    createdAt: event.createdAt || new Date().toISOString(),
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
    id: existing ? existing.id : Utilities.getUuid(),
    email: user.email,
    name: user.name,
    photoUrl: '',
    role: existing ? existing.role : 'Guru',
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  });
  if (!readRows_(SHEET_NAMES.TEACHERS).some(r => r.email === user.email)) {
    upsertRow_(SHEET_NAMES.TEACHERS, {
      id: Utilities.getUuid(),
      email: user.email,
      name: user.name,
      subject: 'Matematika',
      status: 'Aktif',
      createdAt: now,
      updatedAt: now
    });
  }
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

function readRows_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values.shift();
  return values.filter(row => row.some(cell => cell !== '')).map(row =>
    headers.reduce((obj, key, i) => {
      obj[key] = row[i];
      return obj;
    }, {})
  );
}

function findRow_(sheetName, id) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values.shift();
  const idIndex = headers.indexOf('id');
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      return {
        rowNumber: i + 2,
        data: headers.reduce((obj, key, j) => {
          obj[key] = values[i][j];
          return obj;
        }, {})
      };
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
  return { ok: true, data };
}

function updateRow_(sheetName, rowNumber, data) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(key => data[key] ?? '')]);
  return { ok: true, data };
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
