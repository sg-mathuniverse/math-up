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
  Users: ['id', 'email', 'name', 'photoUrl', 'role', 'createdAt', 'updatedAt', 'photoFileId'],
  Teachers: ['id', 'email', 'name', 'subject', 'status', 'createdAt', 'updatedAt', 'phone'],
  Schedule: ['id', 'teacherEmail', 'day', 'startTime', 'endTime', 'className', 'topic', 'room', 'createdAt', 'updatedAt'],
  Todo: ['id', 'teacherEmail', 'title', 'description', 'dueAt', 'priority', 'done', 'createdAt', 'updatedAt'],
  Events: ['id', 'title', 'description', 'eventDate', 'startTime', 'endTime', 'type', 'createdBy', 'createdAt', 'updatedAt'],
  AcademicCalendar: ['id', 'date', 'title', 'type', 'description', 'isNationalHoliday', 'createdAt', 'updatedAt'],
  Substitutions: ['id', 'date', 'startTime', 'endTime', 'className', 'topic', 'room', 'absentTeacherEmail', 'substituteTeacherEmail', 'reason', 'status', 'createdBy', 'createdAt', 'updatedAt', 'emailStatus', 'emailSentAt', 'emailError']
};
// ============================================================
// WEB APP DAN API
// ============================================================
function doGet(e) {
  if (e && e.parameter && e.parameter.api === '1') return handleApi_(e);
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Math Up — Teacher Workspace')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function doPost(e) {
  if (e && e.parameter && e.parameter.api === '1') return handleApi_(e);
  return ContentService
    .createTextOutput(JSON.stringify({ok:false,error:'API tidak valid.'}))
    .setMimeType(ContentService.MimeType.JSON);
}
function handleApi_(e) {
  const action = String((e.parameter && e.parameter.action) || '');
  const callbackInput = String((e.parameter && e.parameter.callback) || '');
  // Callback JSONP wajib berupa identifier JavaScript, bukan ekspresi bebas.
  const callback = /^[A-Za-z_$][0-9A-Za-z_$]{0,100}$/.test(callbackInput)
    ? callbackInput
    : '';
  let args = [];
  try {
    const raw = e.parameter && e.parameter.payload;
    args = raw ? JSON.parse(raw) : [];
  } catch (err) {
    return apiResponse_({ok:false,error:'Payload tidak valid.'}, callback);
  }
  const allowed = {
    getBootstrap:'getBootstrap',
    getCurrentUser:'getCurrentUser',
    saveMyProfile:'saveMyProfile',
    getActiveTeachers:'getActiveTeachers',
    uploadProfilePhotoChunk:'uploadProfilePhotoChunk',
    getSubstitutionRequests:'getSubstitutionRequests',
    getDriveMaterials:'getDriveMaterials',
    getDriveFolderContents:'getDriveFolderContents',
    getEffectiveSchedule:'getEffectiveSchedule',
    saveTodo:'saveTodo',
    updateTodo:'updateTodo',
    deleteTodo:'deleteTodo',
    toggleTodo:'toggleTodo',
    saveTeacher:'saveTeacher',
    saveSchedule:'saveSchedule',
    updateSchedule:'updateSchedule',
    deleteSchedule:'deleteSchedule',
    saveEvent:'saveEvent',
    updateEvent:'updateEvent',
    deleteEvent:'deleteEvent',
    findSubstituteCandidates:'findSubstituteCandidates',
    saveSubstitution:'saveSubstitution',
    retrySubstitutionEmail:'retrySubstitutionEmail',
    respondSubstitution:'respondSubstitution'
  };
  try {
    if (!allowed[action] || typeof this[allowed[action]] !== 'function') {
      throw new Error('API action tidak diizinkan.');
    }
    const result = this[allowed[action]].apply(
      null,
      Array.isArray(args) ? args : [args]
    );
    return apiResponse_(result, callback);
  } catch (err) {
    return apiResponse_({
      ok:false,
      error:err && err.message ? err.message : String(err)
    }, callback);
  }
}
function apiResponse_(payload, callback) {
  const body = JSON.stringify(
    payload && payload.ok === false
      ? payload
      : {ok:true,data:payload}
  );
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
// ============================================================
// SETUP SHEET
// ============================================================
function setupSheets() {
  const ss = getSpreadsheet_();
  Object.keys(HEADERS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS[name].length)
        .setValues([HEADERS[name]]);
      sheet.setFrozenRows(1);
      return;
    }

    // Migrasi aman: kolom baru ditambahkan di sebelah kanan tanpa
    // mengubah urutan kolom lama atau menimpa data yang sudah ada.
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const currentHeaders = sheet.getRange(1, 1, 1, lastColumn)
      .getDisplayValues()[0]
      .map(value => String(value || '').trim());
    const missingHeaders = HEADERS[name]
      .filter(header => !currentHeaders.includes(header));
    if (missingHeaders.length) {
      sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length)
        .setValues([missingHeaders]);
    }
    sheet.setFrozenRows(1);
  });
  return {ok:true,sheets:Object.keys(HEADERS)};
}
// ============================================================
// BOOTSTRAP
// ============================================================
function getBootstrap() {
  const user = requireUser_();
  setupSheets();
  upsertUser_(user);
  const teachers = readRows_(SHEET_NAMES.TEACHERS).filter(t =>
    String(t.status || 'Aktif').trim().toLowerCase() === 'aktif' &&
    String(t.subject || '').trim().toLowerCase() === 'matematika' &&
    String(t.email || '').trim().toLowerCase().endsWith(
      '@' + user.email.split('@').pop()
    )
  );
  const visibleTeacherEmails = new Set(teachers.map(t =>
    String(t.email || '').trim().toLowerCase()
  ));
  // Jadwal lintas guru hanya dibagikan untuk guru Matematika aktif di domain sekolah.
  const allSchedule = readRows_(SHEET_NAMES.SCHEDULE).filter(s =>
    visibleTeacherEmails.has(String(s.teacherEmail || '').trim().toLowerCase())
  );
  const approvedSubs = readRows_(SHEET_NAMES.SUBSTITUTIONS)
    .filter(r => String(r.status || '') === 'Disetujui');
  const today = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || 'Asia/Jakarta',
    'yyyy-MM-dd'
  );
  const effectiveSchedule = buildEffectiveSchedule_(
    allSchedule,
    approvedSubs,
    today
  );
  return {
    ok:true,
    user,
    todos:readRows_(SHEET_NAMES.TODO)
      .filter(r => r.teacherEmail === user.email),
    schedule:effectiveSchedule
      .filter(r => String(r.teacherEmail).toLowerCase() === user.email),
    allSchedule,
    events:readRows_(SHEET_NAMES.EVENTS),
    // Jangan kirim record guru dari domain lain ke klien RMU.
    teachers,
    academicCalendar:readRows_(SHEET_NAMES.CALENDAR),
    // Riwayat yang dikirim ke klien hanya milik pengguna atau ditujukan kepadanya.
    // Semua pengajuan tetap dipakai di atas untuk menghitung jadwal efektif.
    substitutions:readRows_(SHEET_NAMES.SUBSTITUTIONS)
      .filter(r =>
        String(r.status || 'Diajukan') !== 'Ditolak' &&
        (
          String(r.absentTeacherEmail || '').trim().toLowerCase() === user.email ||
          String(r.substituteTeacherEmail || '').trim().toLowerCase() === user.email
        )
      )
  };
}
// ============================================================
// TODO
// ============================================================
function saveTodo(todo) {
  const user = requireUser_();
  setupSheets();
  todo = todo || {};
  const requestedId = String(todo.id || '').trim();
  let existingRow = null;
  if (requestedId) {
    existingRow = findRow_(SHEET_NAMES.TODO, requestedId);
    if (!existingRow ||
        String(existingRow.data.teacherEmail || '').trim().toLowerCase() !== user.email) {
      throw new Error('Tugas tidak ditemukan atau bukan milik akun Anda.');
    }
  }
  const title = String(todo.title || '').trim();
  const description = String(todo.description || '');
  const dueAt = String(todo.dueAt || '').trim();
  const priority = String(todo.priority || 'Sedang').trim();
  if (!title) throw new Error('Nama tugas wajib diisi.');
  if (title.length > 200) throw new Error('Nama tugas maksimal 200 karakter.');
  if (description.length > 5000) throw new Error('Deskripsi tugas maksimal 5000 karakter.');
  if (!['Rendah','Sedang','Tinggi'].includes(priority)) {
    throw new Error('Prioritas tugas tidak valid.');
  }
  if (dueAt) {
    const match = dueAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);
    if (!match || !isValidIsoDate_(match[1]) ||
        !Number.isFinite(timeToMinutes_(match[2])) ||
        (match[3] !== undefined && (!/^\d{2}$/.test(match[3]) || Number(match[3]) > 59))) {
      throw new Error('Deadline tugas tidak valid.');
    }
  }
  const now = new Date().toISOString();
  const data = {
    id:requestedId || Utilities.getUuid(),
    teacherEmail:user.email,
    title,
    description,
    dueAt,
    priority,
    done:Boolean(todo.done),
    createdAt:existingRow?.data.createdAt || now,
    updatedAt:now
  };
  if (existingRow) {
    return updateRow_(SHEET_NAMES.TODO, existingRow.rowNumber, {
      ...existingRow.data,
      ...data
    });
  }
  return upsertRow_(SHEET_NAMES.TODO, data);
}
function updateTodo(todo) {
  return saveTodo(todo);
}
function toggleTodo(id, done) {
  const user = requireUser_();
  setupSheets();
  const row = findRow_(SHEET_NAMES.TODO, id);
  if (
    !row ||
    String(row.data.teacherEmail || '').trim().toLowerCase() !== user.email
  ) {
    throw new Error('Tugas tidak ditemukan atau bukan milik akun Anda.');
  }
  return updateRow_(SHEET_NAMES.TODO, row.rowNumber, {
    ...row.data,
    done:Boolean(done),
    updatedAt:new Date().toISOString()
  });
}
function deleteTodo(id) {
  const user = requireUser_();
  const row = findRow_(SHEET_NAMES.TODO, id);
  if (
    !row ||
    String(row.data.teacherEmail || '').toLowerCase() !== user.email
  ) {
    throw new Error('Tugas tidak ditemukan.');
  }
  getSpreadsheet_().getSheetByName(SHEET_NAMES.TODO)
    .deleteRow(row.rowNumber);
  return {ok:true,id:id};
}
// ============================================================
// GURU
// ============================================================
function saveTeacher(teacher) {
  const user = requireUser_();
  teacher = teacher || {};
  const email = String(teacher.email || '').trim().toLowerCase();
  if (email !== user.email) {
    throw new Error('Guru hanya dapat memperbarui profilnya sendiri.');
  }
  setupSheets();
  const existing = readRows_(SHEET_NAMES.TEACHERS)
    .find(r => String(r.email || '').trim().toLowerCase() === user.email);
  const now = new Date().toISOString();
  const data = {
    id:existing?.id || teacher.id || Utilities.getUuid(),
    email:user.email,
    name:String(teacher.name || '').trim(),
    // Bidang dan status bukan data yang dapat diubah sendiri oleh guru.
    subject:String(existing?.subject || 'Matematika').trim(),
    status:String(existing?.status || 'Aktif').trim(),
    phone:String(teacher.phone !== undefined ? teacher.phone : (existing?.phone || '')).trim(),
    createdAt:existing?.createdAt || teacher.createdAt || now,
    updatedAt:now
  };
  if (existing) {
    const row = findRow_(SHEET_NAMES.TEACHERS, existing.id);
    return updateRow_(SHEET_NAMES.TEACHERS, row.rowNumber, data);
  }
  return upsertRow_(SHEET_NAMES.TEACHERS, data);
}
// ============================================================
// JADWAL REGULER
// ============================================================
function isValidSchoolDay_(value) {
  return ['senin','selasa','rabu','kamis','jumat','sabtu','minggu']
    .includes(String(value || '').trim().toLowerCase());
}
function saveSchedule(item) {
  const user = requireUser_();
  setupSheets();
  item = item || {};
  if (item.teacherEmail && String(item.teacherEmail).toLowerCase() !== user.email) throw new Error('Jadwal harus dimiliki oleh akun yang sedang aktif.');
  if (item.id) {
    const existing = findRow_(SHEET_NAMES.SCHEDULE, item.id);
    if (existing && String(existing.data.teacherEmail || '').trim().toLowerCase() !== user.email) {
      throw new Error('Anda hanya dapat menyimpan jadwal milik Anda sendiri.');
    }
  }
  const day = String(item.day || '').trim();
  const startTime = String(item.startTime || '').trim();
  const endTime = String(item.endTime || '').trim();
  const start = timeToMinutes_(startTime);
  const end = timeToMinutes_(endTime);
  if (!isValidSchoolDay_(day) || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new Error('Hari dan rentang jam jadwal tidak valid.');
  }
  if (!String(item.className || '').trim()) {
    throw new Error('Nama kelas wajib diisi.');
  }
  const overlapsExisting = readRows_(SHEET_NAMES.SCHEDULE).some(s =>
    String(s.teacherEmail || '').trim().toLowerCase() === user.email &&
    String(s.day || '').trim().toLowerCase() === day.toLowerCase() &&
    String(s.id || '') !== String(item.id || '') &&
    overlaps_(s.startTime, s.endTime, startTime, endTime)
  );
  if (overlapsExisting) {
    throw new Error('Jadwal bertumpang tindih dengan jadwal Anda yang sudah ada.');
  }
  return upsertRow_(SHEET_NAMES.SCHEDULE, {
    id: item.id || Utilities.getUuid(), teacherEmail: user.email, day,
    startTime, endTime, className: String(item.className || ''),
    topic: String(item.topic || ''), room: String(item.room || ''), createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}
function updateSchedule(item) {
  const user = requireUser_();
  setupSheets();
  if (!item || !item.id) throw new Error('ID jadwal wajib diisi.');
  const row = findRow_(SHEET_NAMES.SCHEDULE, item.id);
  if (!row) throw new Error('Jadwal tidak ditemukan.');
  if (String(row.data.teacherEmail || '').toLowerCase() !== user.email) throw new Error('Anda hanya dapat mengedit jadwal milik Anda sendiri.');
  const startTime = String(item.startTime || '').trim();
  const endTime = String(item.endTime || '').trim();
  const start = timeToMinutes_(startTime);
  const end = timeToMinutes_(endTime);
  if (!isValidSchoolDay_(item.day) || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new Error('Hari dan jam jadwal tidak valid.');
  }
  if (!String(item.className || '').trim()) {
    throw new Error('Nama kelas wajib diisi.');
  }
  const overlapsExisting = readRows_(SHEET_NAMES.SCHEDULE).some(s =>
    String(s.teacherEmail || '').trim().toLowerCase() === user.email &&
    String(s.day || '').trim().toLowerCase() === String(item.day).trim().toLowerCase() &&
    String(s.id || '') !== String(item.id) &&
    overlaps_(s.startTime, s.endTime, startTime, endTime)
  );
  if (overlapsExisting) {
    throw new Error('Jadwal bertumpang tindih dengan jadwal Anda yang sudah ada.');
  }
  return updateRow_(SHEET_NAMES.SCHEDULE, row.rowNumber, {
    ...row.data,
    day: String(item.day),
    startTime,
    endTime,
    className: String(item.className || '').trim(),
    topic: String(item.topic || '').trim(),
    room: String(item.room || '').trim(),
    updatedAt: new Date().toISOString()
  });
}
function deleteSchedule(id) {
  const user = requireUser_();
  setupSheets();
  if (!id) throw new Error('ID jadwal wajib diisi.');
  const row = findRow_(SHEET_NAMES.SCHEDULE, id);
  if (!row) throw new Error('Jadwal tidak ditemukan.');
  if (String(row.data.teacherEmail || '').toLowerCase() !== user.email) {
    throw new Error('Anda hanya dapat menghapus jadwal milik Anda sendiri.');
  }
  getSpreadsheet_().getSheetByName(SHEET_NAMES.SCHEDULE)
    .deleteRow(row.rowNumber);
  return {ok:true,id:String(id)};
}
// ============================================================
// AGENDA SEKOLAH
// ============================================================
function saveEvent(event) {
  const user = requireUser_();
  setupSheets();
  event = event || {};
  if (event.id) {
    const existing = findRow_(SHEET_NAMES.EVENTS, event.id);
    if (existing && String(existing.data.createdBy || '').trim().toLowerCase() !== user.email) {
      throw new Error('Anda hanya dapat menyimpan agenda yang Anda buat sendiri.');
    }
  }
  const title = String(event.title || '').trim();
  const eventDate = String(event.eventDate || '').trim();
  const startTime = String(event.startTime || '').trim();
  const endTime = String(event.endTime || '').trim();
  if (!title) throw new Error('Nama agenda wajib diisi.');
  if (!isValidIsoDate_(eventDate)) throw new Error('Tanggal agenda tidak valid.');
  if (Boolean(startTime) !== Boolean(endTime)) {
    throw new Error('Jam mulai dan jam selesai harus diisi bersama.');
  }
  if (startTime && (
    !Number.isFinite(timeToMinutes_(startTime)) ||
    !Number.isFinite(timeToMinutes_(endTime)) ||
    timeToMinutes_(startTime) >= timeToMinutes_(endTime)
  )) {
    throw new Error('Rentang jam agenda tidak valid.');
  }
  return upsertRow_(SHEET_NAMES.EVENTS, {
    id:event.id || Utilities.getUuid(),
    title,
    description:String(event.description || ''),
    eventDate,
    startTime,
    endTime,
    type:event.type || 'Sekolah',
    createdBy:user.email,
    createdAt:event.createdAt || new Date().toISOString(),
    updatedAt:new Date().toISOString()
  });
}
function updateEvent(event) {
  const user = requireUser_();
  setupSheets();
  if (!event || !event.id) throw new Error('ID agenda wajib diisi.');
  const row = findRow_(SHEET_NAMES.EVENTS, event.id);
  if (!row) throw new Error('Agenda tidak ditemukan.');
  if (String(row.data.createdBy || '').toLowerCase() !== user.email) {
    throw new Error('Anda hanya dapat mengedit agenda yang Anda buat sendiri.');
  }
  const title = String(event.title || '').trim();
  const eventDate = String(event.eventDate || '').trim();
  const startTime = String(event.startTime || '').trim();
  const endTime = String(event.endTime || '').trim();
  if (!title) throw new Error('Nama agenda wajib diisi.');
  if (!isValidIsoDate_(eventDate)) throw new Error('Tanggal agenda tidak valid.');
  if (Boolean(startTime) !== Boolean(endTime)) {
    throw new Error('Jam mulai dan jam selesai harus diisi bersama.');
  }
  if (startTime && (
    !Number.isFinite(timeToMinutes_(startTime)) ||
    !Number.isFinite(timeToMinutes_(endTime)) ||
    timeToMinutes_(startTime) >= timeToMinutes_(endTime)
  )) {
    throw new Error('Rentang jam agenda tidak valid.');
  }
  return updateRow_(SHEET_NAMES.EVENTS, row.rowNumber, {
    ...row.data,
    title,
    description:String(event.description || ''),
    eventDate,
    startTime,
    endTime,
    type:String(event.type || 'Agenda sekolah'),
    updatedAt:new Date().toISOString()
  });
}
function deleteEvent(id) {
  const user = requireUser_();
  setupSheets();
  if (!id) throw new Error('ID agenda wajib diisi.');
  const row = findRow_(SHEET_NAMES.EVENTS, id);
  if (!row) throw new Error('Agenda tidak ditemukan.');
  if (String(row.data.createdBy || '').toLowerCase() !== user.email) {
    throw new Error('Anda hanya dapat menghapus agenda yang Anda buat sendiri.');
  }
  getSpreadsheet_().getSheetByName(SHEET_NAMES.EVENTS)
    .deleteRow(row.rowNumber);
  return {ok:true,id:String(id)};
}
// ============================================================
// PENCARIAN KANDIDAT GURU PENGGANTI
// ============================================================
function findSubstituteCandidates(request) {
  const user=requireUser_(); setupSheets(); request=request||{};
  const date=String(request.date||'').trim(), startTime=String(request.startTime||'').trim(), endTime=String(request.endTime||'').trim();
  const rs=timeToMinutes_(startTime), re=timeToMinutes_(endTime);
  if(!isValidIsoDate_(date)||!startTime||!endTime)throw new Error('Tanggal, jam mulai, dan jam selesai wajib diisi dengan format yang valid.');
  if(!Number.isFinite(rs)||!Number.isFinite(re)||rs>=re)throw new Error('Rentang waktu pengganti tidak valid.');
  const absent=String(request.absentTeacherEmail||user.email).trim().toLowerCase();
  if(absent!==user.email)throw new Error('Guru hanya dapat mencari pengganti untuk jadwalnya sendiri.');
  const day=String(request.day||dayNameId_(date)).trim().toLowerCase();
  const schedules=readRows_(SHEET_NAMES.SCHEDULE);
  const events=readRows_(SHEET_NAMES.EVENTS).filter(e=>String(e.eventDate||'').trim()===date);
  const subs=readRows_(SHEET_NAMES.SUBSTITUTIONS).filter(s=>String(s.date||'').trim()===date&&String(s.status||'Diajukan').trim().toLowerCase()!=='ditolak');
  const schoolDomain=user.email.split('@').pop();
  const teachers=readRows_(SHEET_NAMES.TEACHERS).filter(t=>String(t.status||'Aktif').trim().toLowerCase()==='aktif'&&String(t.subject||'').trim().toLowerCase()==='matematika'&&String(t.email||'').trim().toLowerCase().endsWith('@'+schoolDomain));
  const agenda=events.map(e=>{const a=String(e.startTime||'').trim(),b=String(e.endTime||'').trim();if(!a&&!b)return null;const x=timeToMinutes_(a),y=timeToMinutes_(b);if(!a||!b||!Number.isFinite(x)||!Number.isFinite(y)||x>=y)return {start:0,end:1440};return {start:x,end:y};}).filter(Boolean);
  function merge(xs){const sorted=xs.filter(x=>Number.isFinite(x.start)&&Number.isFinite(x.end)&&x.start<x.end).map(x=>({start:Math.max(0,x.start),end:Math.min(1440,x.end)})).filter(x=>x.start<x.end).sort((a,b)=>a.start-b.start);const out=[];sorted.forEach(x=>{const last=out[out.length-1];if(last&&x.start<=last.end)last.end=Math.max(last.end,x.end);else out.push({...x});});return out;}
  function gaps(xs){let cursor=rs;const out=[];merge(xs).forEach(x=>{if(x.end<=rs||x.start>=re)return;const a=Math.max(rs,x.start),b=Math.min(re,x.end);if(a>cursor)out.push({start:cursor,end:a});cursor=Math.max(cursor,b);});if(cursor<re)out.push({start:cursor,end:re});return out;}
  return teachers.filter(t=>String(t.email||'').trim().toLowerCase()!==absent).map(t=>{
    const email=String(t.email||'').trim().toLowerCase();
    const regular=schedules.filter(s=>String(s.teacherEmail||'').trim().toLowerCase()===email&&String(s.day||'').trim().toLowerCase()===day);
    const assigned=subs.filter(s=>String(s.substituteTeacherEmail||'').trim().toLowerCase()===email);
    const conflicts=regular.concat(assigned).filter(s=>{const a=timeToMinutes_(s.startTime),b=timeToMinutes_(s.endTime);return Number.isFinite(a)&&Number.isFinite(b)&&a<re&&b>rs;});
    const blocks=regular.concat(assigned).map(s=>({start:timeToMinutes_(s.startTime),end:timeToMinutes_(s.endTime)})).concat(agenda);
    const availableSegments=gaps(blocks).map(x=>({startTime:minutesToTimeSafe_(x.start),endTime:minutesToTimeSafe_(x.end)}));
    const dailyLoad=regular.length;let status='Tersedia';if(!availableSegments.length)status='Tidak tersedia';else if(conflicts.length)status='Sebagian tersedia';
    return {email,name:String(t.name||email.split('@')[0]),subject:String(t.subject||'Matematika'),status,conflicts,availableSegments,dailyLoad};
  }).filter(t=>t.availableSegments.length).sort((a,b)=>{
    const da=a.availableSegments.reduce((n,x)=>n+timeToMinutes_(x.endTime)-timeToMinutes_(x.startTime),0);
    const db=b.availableSegments.reduce((n,x)=>n+timeToMinutes_(x.endTime)-timeToMinutes_(x.startTime),0);
    return db-da||a.dailyLoad-b.dailyLoad||a.name.localeCompare(b.name);
  });
}
// ============================================================
// PEMERIKSAAN KETERSEDIAAN PENUH
// ============================================================
function isTeacherAvailableForInterval_(teacherEmail,date,startTime,endTime,excludeSubstitutionId) {
  const email=String(teacherEmail||'').trim().toLowerCase(), start=timeToMinutes_(startTime), end=timeToMinutes_(endTime);
  if(!email||!date||!Number.isFinite(start)||!Number.isFinite(end)||start>=end)return false;
  const day=dayNameId_(date), schedules=readRows_(SHEET_NAMES.SCHEDULE);
  if(schedules.some(s=>String(s.teacherEmail||'').trim().toLowerCase()===email&&String(s.day||'').trim().toLowerCase()===String(day).toLowerCase()&&overlaps_(s.startTime,s.endTime,startTime,endTime)))return false;
  const events=readRows_(SHEET_NAMES.EVENTS);
  if(events.some(e=>{if(String(e.eventDate||'').trim()!==String(date).trim())return false;const a=String(e.startTime||'').trim(),b=String(e.endTime||'').trim();if(!a&&!b)return false;if(!a||!b||!Number.isFinite(timeToMinutes_(a))||!Number.isFinite(timeToMinutes_(b))||timeToMinutes_(a)>=timeToMinutes_(b))return true;return overlaps_(a,b,startTime,endTime);}))return false;
  const subs=readRows_(SHEET_NAMES.SUBSTITUTIONS);
  if(subs.some(s=>{if(String(s.substituteTeacherEmail||'').trim().toLowerCase()!==email||String(s.date||'').trim()!==String(date).trim())return false;if(excludeSubstitutionId&&String(s.id)===String(excludeSubstitutionId))return false;if(String(s.status||'Diajukan').trim().toLowerCase()==='ditolak')return false;return overlaps_(s.startTime,s.endTime,startTime,endTime);}))return false;
  return true;
}
// ============================================================
// MENYIMPAN PERMINTAAN PENGGANTI
// ============================================================
function saveSubstitution(item) {
  const user = requireUser_();
  setupSheets();
  if (!item || typeof item !== 'object') throw new Error('Data pengajuan tidak valid.');

  const absent = String(item.absentTeacherEmail || user.email).trim().toLowerCase();
  const substitute = String(item.substituteTeacherEmail || '').trim().toLowerCase();
  const date = String(item.date || '').trim();
  const startTime = String(item.startTime || '').trim();
  const endTime = String(item.endTime || '').trim();
  if (absent !== user.email) throw new Error('Pengajuan hanya dapat dibuat oleh guru yang izin.');
  if (!substitute || substitute === absent) throw new Error('Guru pengganti tidak valid.');
  if (substitute.split('@').pop() !== user.email.split('@').pop()) {
    throw new Error('Guru pengganti harus menggunakan email dari domain sekolah yang sama.');
  }
  const activeSubstitute = readRows_(SHEET_NAMES.TEACHERS).some(t =>
    String(t.email || '').trim().toLowerCase() === substitute &&
    String(t.status || 'Aktif').trim().toLowerCase() === 'aktif' &&
    String(t.subject || '').trim().toLowerCase() === 'matematika'
  );
  if (!activeSubstitute) {
    throw new Error('Guru pengganti harus terdaftar sebagai guru Matematika aktif di RMU.');
  }
  const start = timeToMinutes_(startTime);
  const end = timeToMinutes_(endTime);
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(date + 'T00:00:00Z')
    : null;
  const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0,10) === date;
  if (!validDate || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new Error('Tanggal dan rentang jam pengganti tidak valid.');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error('Sistem sedang memproses pengajuan lain. Silakan coba lagi.');
  }

  let id = '';
  let teacher = null;
  let absentTeacher = null;
  let className = '';
  let topic = '';
  let room = '';
  let reason = '';
  let savedData = null;

  try {
    const teachers = readRows_(SHEET_NAMES.TEACHERS);
    teacher = teachers.find(t =>
      String(t.email || '').trim().toLowerCase() === substitute &&
      String(t.subject || '').trim().toLowerCase() === 'matematika' &&
      String(t.status || 'Aktif').trim().toLowerCase() === 'aktif'
    );
    if (!teacher) throw new Error('Guru pengganti tidak ditemukan atau tidak aktif.');
    if (!isTeacherAvailableForInterval_(substitute,date,startTime,endTime,null)) {
      throw new Error('Guru pengganti memiliki jadwal, agenda, atau penugasan lain yang bertabrakan.');
    }
    const existing = readRows_(SHEET_NAMES.SUBSTITUTIONS).some(s =>
      String(s.date || '').trim() === date &&
      String(s.absentTeacherEmail || '').trim().toLowerCase() === absent &&
      String(s.status || 'Diajukan').trim().toLowerCase() !== 'ditolak' &&
      overlaps_(s.startTime,s.endTime,startTime,endTime)
    );
    if (existing) {
      throw new Error('Anda sudah memiliki permintaan pengganti yang bertumpang tindih pada waktu tersebut.');
    }

    const now = new Date().toISOString();
    id = Utilities.getUuid();
    absentTeacher = teachers.find(t =>
      String(t.email || '').trim().toLowerCase() === absent
    );
    className = String(item.className || '').trim();
    topic = String(item.topic || '').trim();
    room = String(item.room || '').trim();
    reason = String(item.reason || '').trim();
    const saved = upsertRow_(SHEET_NAMES.SUBSTITUTIONS,{
      id,date,startTime,endTime,className,topic,room,
      absentTeacherEmail:absent,
      substituteTeacherEmail:substitute,
      reason,
      status:'Diajukan',
      createdBy:user.email,
      createdAt:now,
      updatedAt:now,
      emailStatus:'Menunggu',
      emailSentAt:'',
      emailError:''
    });
    savedData = saved.data;
  } finally {
    // Jangan tahan lock saat menghubungi layanan email.
    lock.releaseLock();
  }

  let emailStatus = 'Terkirim';
  let emailSentAt = new Date().toISOString();
  let emailError = '';
  try {
    const requesterName = String(absentTeacher?.name || user.name || absent);
    const subject = 'Permintaan Guru Pengganti — ' + className + ' (' + date + ')';
    const body = [
      'Halo ' + String(teacher.name || 'Guru') + ',',
      '',
      requesterName + ' mengajukan Anda sebagai guru pengganti.',
      'Tanggal: ' + date,
      'Waktu: ' + startTime + '–' + endTime,
      'Kelas: ' + (className || '-'),
      'Topik: ' + (topic || '-'),
      'Ruangan: ' + (room || '-'),
      'Alasan: ' + (reason || '-'),
      '',
      'Silakan buka Ruang Math Up menggunakan akun sekolah Anda untuk menerima atau menolak permintaan ini.',
      '',
      'Email ini dikirim otomatis oleh Ruang Math Up.'
    ].join('\n');
    MailApp.sendEmail({
      to:substitute,
      subject,
      body,
      name:'Ruang Math Up'
    });
  } catch (emailException) {
    emailStatus = 'Gagal';
    emailSentAt = '';
    emailError = String(
      emailException && emailException.message ? emailException.message : emailException
    ).slice(0,500);
  }

  const savedRow = findRow_(SHEET_NAMES.SUBSTITUTIONS,id);
  const updated = updateRow_(SHEET_NAMES.SUBSTITUTIONS,savedRow.rowNumber,{
    emailStatus,
    emailSentAt,
    emailError,
    updatedAt:new Date().toISOString()
  });
  return {...updated.data,emailStatus,emailError};
}

// Kirim ulang notifikasi hanya jika email sebelumnya gagal/tertunda.
// Akses dibatasi ke guru pengaju; permintaan yang sudah terkirim tidak dapat dikirim ulang.
function retrySubstitutionEmail(id) {
  const user = requireUser_();
  setupSheets();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Sistem sedang memproses permintaan lain. Silakan coba lagi.');

  let row;
  let data;
  let teacher;
  let requester;
  try {
    row = findRow_(SHEET_NAMES.SUBSTITUTIONS, String(id || '').trim());
    if (!row) throw new Error('Permintaan guru pengganti tidak ditemukan.');
    data = row.data;
    if (String(data.absentTeacherEmail || '').trim().toLowerCase() !== user.email) {
      throw new Error('Hanya guru pengaju yang dapat mengirim ulang notifikasi ini.');
    }
    if (String(data.status || '').trim() !== 'Diajukan') {
      throw new Error('Notifikasi hanya dapat dikirim ulang saat permintaan masih diajukan.');
    }
    const emailStatus = String(data.emailStatus || 'Menunggu').trim();
    if (emailStatus === 'Terkirim' || data.emailSentAt) {
      throw new Error('Email notifikasi sudah tercatat terkirim; pengiriman ulang dibatalkan agar tidak duplikat.');
    }
    if (!['Gagal',''].includes(emailStatus)) {
      throw new Error('Hanya notifikasi yang tercatat gagal yang dapat dikirim ulang. Status menunggu perlu diperiksa terlebih dahulu agar tidak terjadi email duplikat.');
    }

    const substitute = String(data.substituteTeacherEmail || '').trim().toLowerCase();
    const domain = user.email.split('@').pop();
    if (!substitute || substitute.split('@').pop() !== domain) {
      throw new Error('Alamat guru pengganti tidak valid untuk domain sekolah.');
    }
    const teachers = readRows_(SHEET_NAMES.TEACHERS);
    teacher = teachers.find(t =>
      String(t.email || '').trim().toLowerCase() === substitute &&
      String(t.status || 'Aktif').trim().toLowerCase() === 'aktif' &&
      String(t.subject || '').trim().toLowerCase() === 'matematika'
    );
    if (!teacher) throw new Error('Guru pengganti tidak lagi terdaftar sebagai guru Matematika aktif.');
    requester = teachers.find(t =>
      String(t.email || '').trim().toLowerCase() === user.email
    );

    // Status "Mengirim" mencegah klik ganda atau dua permintaan bersamaan.
    updateRow_(SHEET_NAMES.SUBSTITUTIONS, row.rowNumber, {
      ...data,
      emailStatus:'Mengirim',
      emailError:'',
      updatedAt:new Date().toISOString()
    });
  } finally {
    lock.releaseLock();
  }

  const substitute = String(data.substituteTeacherEmail || '').trim().toLowerCase();
  let nextStatus = 'Terkirim';
  let sentAt = new Date().toISOString();
  let errorMessage = '';
  try {
    const subject = 'Permintaan Guru Pengganti — ' +
      String(data.className || '-') + ' (' + String(data.date || '-') + ')';
    const body = [
      'Halo ' + String(teacher.name || 'Guru') + ',',
      '',
      String(requester?.name || user.name || user.email) + ' mengajukan Anda sebagai guru pengganti.',
      'Tanggal: ' + String(data.date || '-'),
      'Waktu: ' + String(data.startTime || '-') + '–' + String(data.endTime || '-'),
      'Kelas: ' + String(data.className || '-'),
      'Topik: ' + String(data.topic || '-'),
      'Ruangan: ' + String(data.room || '-'),
      'Alasan: ' + String(data.reason || '-'),
      '',
      'Silakan buka Ruang Math Up menggunakan akun sekolah Anda untuk menerima atau menolak permintaan ini.',
      '',
      'Email ini dikirim otomatis oleh Ruang Math Up.'
    ].join('\\n');
    MailApp.sendEmail({to:substitute,subject,body,name:'Ruang Math Up'});
  } catch (emailException) {
    nextStatus = 'Gagal';
    sentAt = '';
    errorMessage = String(emailException && emailException.message ? emailException.message : emailException).slice(0,500);
  }

  const savedRow = findRow_(SHEET_NAMES.SUBSTITUTIONS, String(id || '').trim());
  if (!savedRow) throw new Error('Permintaan tidak ditemukan saat memperbarui status email.');
  const updated = updateRow_(SHEET_NAMES.SUBSTITUTIONS, savedRow.rowNumber, {
    ...savedRow.data,
    emailStatus:nextStatus,
    emailSentAt:sentAt,
    emailError:errorMessage,
    updatedAt:new Date().toISOString()
  });
  return {...updated.data,emailStatus:nextStatus,emailError:errorMessage};
}
// ============================================================
// JADWAL EFEKTIF
// ============================================================
function buildEffectiveSchedule_(schedules, substitutions, targetDate) {
  const date = String(targetDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd'));
  const day = dayNameId_(date);
  let base = schedules.map(s => ({...s, scheduleType: 'Reguler', originalTeacherEmail: s.teacherEmail}));
  const activeSubs = substitutions.filter(sub =>
    String(sub.date || '') === date && String(sub.status || '') === 'Disetujui'
  ).sort((a,b) => timeToMinutes_(a.startTime) - timeToMinutes_(b.startTime));
  activeSubs.forEach(sub => {
    const absent = String(sub.absentTeacherEmail || '').toLowerCase();
    const substitute = String(sub.substituteTeacherEmail || '').toLowerCase();
    const subStart = timeToMinutes_(sub.startTime);
    const subEnd = timeToMinutes_(sub.endTime);
    if (!Number.isFinite(subStart) || !Number.isFinite(subEnd) || subStart >= subEnd) return;
    const matching = base.filter(s =>
      String(s.teacherEmail || '').toLowerCase() === absent &&
      String(s.day || '').toLowerCase() === day.toLowerCase() &&
      overlaps_(s.startTime, s.endTime, sub.startTime, sub.endTime) &&
      (!sub.className || String(s.className || '') === String(sub.className))
    );
    const matchedIds = new Set(matching.map(s => s.id));
    const remaining = base.filter(s => !matchedIds.has(s.id));
    matching.forEach(s => {
      const originalStart = timeToMinutes_(s.startTime);
      const originalEnd = timeToMinutes_(s.endTime);
      if (originalStart < subStart) remaining.push({
        ...s, id: String(s.id) + '-before-' + sub.id,
        startTime: minutesToTimeSafe_(originalStart), endTime: minutesToTimeSafe_(Math.min(originalEnd, subStart))
      });
      if (originalEnd > subEnd) remaining.push({
        ...s, id: String(s.id) + '-after-' + sub.id,
        startTime: minutesToTimeSafe_(Math.max(originalStart, subEnd)), endTime: minutesToTimeSafe_(originalEnd)
      });
    });
    base = remaining;
    const source = matching[0] || {
      id: 'sub-' + sub.id, day, startTime: sub.startTime, endTime: sub.endTime,
      className: sub.className, topic: sub.topic, room: sub.room
    };
    base.push({
      ...source,
      id: String(source.id) + '-sub-' + sub.id,
      day, startTime: String(sub.startTime), endTime: String(sub.endTime),
      className: sub.className || source.className,
      topic: sub.topic || source.topic,
      room: sub.room || source.room,
      teacherEmail: substitute,
      originalTeacherEmail: absent,
      scheduleType: 'Pengganti',
      substitutionId: sub.id,
      substitutionDate: sub.date,
      substitutionStatus: sub.status,
      substituteFor: absent
    });
  });
  return base;
}
function getEffectiveSchedule(date) {
  const user = requireUser_();
  setupSheets();
  const targetDate = String(date || '').trim();
  if (!isValidIsoDate_(targetDate)) {
    throw new Error('Tanggal tidak valid.');
  }
  const teachers = readRows_(SHEET_NAMES.TEACHERS).filter(t =>
    String(t.status || 'Aktif').trim().toLowerCase() === 'aktif' &&
    String(t.subject || '').trim().toLowerCase() === 'matematika' &&
    String(t.email || '').trim().toLowerCase().endsWith(
      '@' + user.email.split('@').pop()
    )
  );
  const visibleTeacherEmails = new Set(teachers.map(t =>
    String(t.email || '').trim().toLowerCase()
  ));
  const schedules = readRows_(SHEET_NAMES.SCHEDULE).filter(s =>
    visibleTeacherEmails.has(String(s.teacherEmail || '').trim().toLowerCase())
  );
  const approvedSubs = readRows_(SHEET_NAMES.SUBSTITUTIONS)
    .filter(r => String(r.status || '') === 'Disetujui');
  return buildEffectiveSchedule_(schedules,approvedSubs,targetDate).filter(s =>
    visibleTeacherEmails.has(String(s.teacherEmail || '').trim().toLowerCase()) ||
    visibleTeacherEmails.has(String(s.originalTeacherEmail || '').trim().toLowerCase())
  );
}
// ============================================================
// PERMINTAAN YANG MENUNGGU RESPONS
// ============================================================
function getSubstitutionRequests() {
  const user = requireUser_();
  setupSheets();
  return readRows_(SHEET_NAMES.SUBSTITUTIONS).filter(r =>
    String(r.substituteTeacherEmail || '').toLowerCase() === user.email &&
    String(r.status || 'Diajukan') === 'Diajukan'
  );
}
// ============================================================
// MENERIMA ATAU MENOLAK PERMINTAAN
// ============================================================
function respondSubstitution(id, response) {
  const user = requireUser_();
  setupSheets();
  const action = String(response || '').trim().toLowerCase();
  if (action !== 'terima' && action !== 'tolak') {
    throw new Error('Respons tidak valid.');
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error('Sistem sedang memproses permintaan lain. Silakan coba lagi.');
  }
  try {
    const row = findRow_(SHEET_NAMES.SUBSTITUTIONS,id);
    if (!row) {
      throw new Error('Permintaan pergantian tidak ditemukan.');
    }
    const data = row.data;
    const substituteEmail = String(
      data.substituteTeacherEmail || ''
    ).trim().toLowerCase();
    if (substituteEmail !== user.email) {
      throw new Error(
        'Hanya guru yang ditunjuk yang dapat merespons permintaan ini.'
      );
    }
    if (
      String(data.status || 'Diajukan').trim().toLowerCase() !== 'diajukan'
    ) {
      throw new Error('Permintaan ini sudah diproses sebelumnya.');
    }
    if (action === 'terima') {
      const available = isTeacherAvailableForInterval_(
        substituteEmail,
        String(data.date || ''),
        String(data.startTime || ''),
        String(data.endTime || ''),
        data.id
      );
      if (!available) {
        throw new Error(
          'Permintaan tidak dapat diterima karena jadwal, agenda, atau penugasan lain bertabrakan.'
        );
      }
    }
    return updateRow_(SHEET_NAMES.SUBSTITUTIONS,row.rowNumber,{
      ...data,
      status:action === 'terima' ? 'Disetujui' : 'Ditolak',
      updatedAt:new Date().toISOString()
    });
  } finally {
    lock.releaseLock();
  }
}
// ============================================================
// PENGGUNA DAN PROFIL
// ============================================================
function getCurrentUser() {
  const user = requireUser_();
  setupSheets();
  const teacher = readRows_(SHEET_NAMES.TEACHERS)
    .find(r => String(r.email || '').trim().toLowerCase() === user.email);
  const profile = readRows_(SHEET_NAMES.USERS)
    .find(r => String(r.email || '').trim().toLowerCase() === user.email);
  if (teacher && String(teacher.name || '').trim()) {
    user.name = String(teacher.name).trim();
  } else if (profile && String(profile.name || '').trim()) {
    user.name = String(profile.name).trim();
  }
  user.phone = String(teacher?.phone || '');
  user.photoUrl = profile?.photoFileId
    ? getProfilePhotoDataUrl_(String(profile.photoFileId))
    : '';
  return user;
}

function saveMyProfile(profile) {
  const user = requireUser_();
  setupSheets();
  profile = profile || {};
  const name = String(profile.name || '').trim();
  const phone = String(profile.phone || '').trim();
  if (!name) throw new Error('Nama guru wajib diisi.');
  if (name.length > 120) throw new Error('Nama guru maksimal 120 karakter.');
  if (phone.length > 30) throw new Error('Nomor HP maksimal 30 karakter.');

  const now = new Date().toISOString();
  const teachers = readRows_(SHEET_NAMES.TEACHERS);
  const existingTeacher = teachers.find(r =>
    String(r.email || '').trim().toLowerCase() === user.email
  );
  const teacherData = {
    id:existingTeacher?.id || Utilities.getUuid(),
    email:user.email,
    name,
    subject:String(existingTeacher?.subject || 'Matematika'),
    status:String(existingTeacher?.status || 'Aktif'),
    phone,
    createdAt:existingTeacher?.createdAt || now,
    updatedAt:now
  };
  if (existingTeacher) {
    const row = findRow_(SHEET_NAMES.TEACHERS, existingTeacher.id);
    updateRow_(SHEET_NAMES.TEACHERS, row.rowNumber, teacherData);
  } else {
    upsertRow_(SHEET_NAMES.TEACHERS, teacherData);
  }

  const users = readRows_(SHEET_NAMES.USERS);
  const existingUser = users.find(r =>
    String(r.email || '').trim().toLowerCase() === user.email
  );
  upsertRow_(SHEET_NAMES.USERS, {
    id:existingUser?.id || Utilities.getUuid(),
    email:user.email,
    name,
    photoUrl:'',
    photoFileId:existingUser?.photoFileId || '',
    role:existingUser?.role || 'Guru',
    createdAt:existingUser?.createdAt || now,
    updatedAt:now
  });
  return getCurrentUser();
}

function getActiveTeachers() {
  const user = requireUser_();
  const schoolDomain = user.email.split('@').pop();
  setupSheets();
  return readRows_(SHEET_NAMES.TEACHERS)
    .filter(t =>
      String(t.status || 'Aktif').trim().toLowerCase() === 'aktif' &&
      String(t.subject || '').trim().toLowerCase() === 'matematika' &&
      String(t.email || '').trim().toLowerCase().endsWith('@' + schoolDomain)
    )
    .map(t => ({
      id:String(t.id || ''),
      name:String(t.name || ''),
      email:String(t.email || ''),
      phone:String(t.phone || ''),
      subject:String(t.subject || 'Matematika'),
      status:String(t.status || 'Aktif')
    }))
    .sort((a,b) => a.name.localeCompare(b.name, 'id'));
}

function getProfilePhotoFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const existingId = properties.getProperty('PROFILE_PHOTO_FOLDER_ID');
  let folder = null;
  if (existingId) {
    try { folder = DriveApp.getFolderById(existingId); } catch (e) {}
  }
  if (!folder) {
    // Folder baru dibuat di Drive pemilik script dengan akses privat.
    folder = DriveApp.createFolder('RMU Profile Photos');
    properties.setProperty('PROFILE_PHOTO_FOLDER_ID', folder.getId());
  }
  const access = folder.getSharingAccess();
  if (access !== DriveApp.Access.PRIVATE) {
    throw new Error('Folder foto profil tidak memiliki akses privat. Pastikan akses folder benar-benar Terbatas sebelum mengunggah foto.');
  }
  return folder;
}

// Jalankan satu kali dari editor Apps Script untuk menyiapkan folder foto profil
// dan melihat tautan folder Drive. Folder dibuat otomatis jika belum ada.
// Fungsi ini tidak diekspos sebagai endpoint API publik.
function setupProfilePhotoFolder() {
  const folder = getProfilePhotoFolder_();
  const result = {
    ok:true,
    folderName:folder.getName(),
    folderId:folder.getId(),
    folderUrl:folder.getUrl(),
    sharingAccess:String(folder.getSharingAccess()),
    note:'Folder foto profil dibuat di Drive utama pemilik Apps Script agar tetap terpisah dari folder bersama.'
  };
  console.log('setupProfilePhotoFolder RESULT: ' + JSON.stringify(result));
  Logger.log('setupProfilePhotoFolder RESULT: ' + JSON.stringify(result));
  return result;
}

function getProfilePhotoDataUrl_(fileId) {
  try {
    const id = String(fileId || '').trim();
    if (!id) return '';

    // Hanya sajikan foto yang tetap berada di folder khusus RMU dan
    // tidak dibagikan secara publik. Jangan mempercayai file ID dari Sheet saja.
    const folder = getProfilePhotoFolder_();
    const file = DriveApp.getFileById(id);
    if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) return '';

    const parents = file.getParents();
    let belongsToPrivatePhotoFolder = false;
    while (parents.hasNext()) {
      if (parents.next().getId() === folder.getId()) {
        belongsToPrivatePhotoFolder = true;
        break;
      }
    }
    if (!belongsToPrivatePhotoFolder) return '';

    const blob = file.getBlob();
    const mimeType = String(blob.getContentType() || file.getMimeType());
    if (!['image/jpeg','image/png','image/webp'].includes(mimeType)) return '';
    return 'data:' + mimeType + ';base64,' +
      Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return '';
  }
}

function uploadProfilePhotoChunk(uploadId, chunkIndex, totalChunks, chunk, mimeType) {
  const user = requireUser_();
  const id = String(uploadId || '');
  const index = Number(chunkIndex);
  const total = Number(totalChunks);
  const data = String(chunk || '');
  const type = String(mimeType || '').toLowerCase();
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id)) throw new Error('ID unggahan foto tidak valid.');
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || total > 120 || index < 0 || index >= total) {
    throw new Error('Urutan unggahan foto tidak valid.');
  }
  if (!['image/jpeg','image/png','image/webp'].includes(type)) {
    throw new Error('Format foto harus JPG, PNG, atau WebP.');
  }
  if (!data || data.length > 6000 || !/^[A-Za-z0-9+/=]+$/.test(data)) {
    throw new Error('Bagian data foto tidak valid.');
  }

  const cache = CacheService.getScriptCache();
  const userKey = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, user.email)
  ).slice(0,20);
  const prefix = 'rmu_photo_' + userKey + '_' + id + '_';
  cache.put(prefix + index, data, 600);
  if (index !== total - 1) return {complete:false,received:index + 1,totalChunks:total};

  setupSheets();
  let combined = '';
  const keys = [];
  for (let i = 0; i < total; i++) {
    const key = prefix + i;
    const part = cache.get(key);
    if (!part) throw new Error('Unggahan foto terputus. Silakan coba unggah kembali.');
    combined += part;
    keys.push(key);
  }
  const bytes = Utilities.base64Decode(combined);
  if (!bytes.length || bytes.length > 512 * 1024) {
    keys.forEach(key => cache.remove(key));
    throw new Error('Ukuran foto setelah diproses maksimal 512 KB.');
  }
  const signature = Array.from(bytes.slice(0,12), b => b & 255);
  const isJpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
  const isPng = signature.slice(0,8).join(',') === '137,80,78,71,13,10,26,10';
  const isWebp = signature.slice(0,4).join(',') === '82,73,70,70' &&
    signature.slice(8,12).join(',') === '87,69,66,80';
  if (!(type === 'image/jpeg' && isJpeg) &&
      !(type === 'image/png' && isPng) &&
      !(type === 'image/webp' && isWebp)) {
    keys.forEach(key => cache.remove(key));
    throw new Error('Isi file tidak cocok dengan format foto yang dipilih.');
  }

  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const folder = getProfilePhotoFolder_();
  const filename = 'profile-' + userKey + '-' + Date.now() + '.' + extension;
  const file = folder.createFile(Utilities.newBlob(bytes, type, filename));

  const users = readRows_(SHEET_NAMES.USERS);
  const existing = users.find(row =>
    String(row.email || '').trim().toLowerCase() === user.email
  );
  const now = new Date().toISOString();
  try {
    upsertRow_(SHEET_NAMES.USERS, {
      id:existing?.id || Utilities.getUuid(),
      email:user.email,
      name:String(existing?.name || user.name || ''),
      photoUrl:'',
      photoFileId:file.getId(),
      role:existing?.role || 'Guru',
      createdAt:existing?.createdAt || now,
      updatedAt:now
    });
  } catch (e) {
    file.setTrashed(true);
    throw e;
  }

  if (existing?.photoFileId && existing.photoFileId !== file.getId()) {
    try { DriveApp.getFileById(String(existing.photoFileId)).setTrashed(true); } catch (e) {}
  }
  keys.forEach(key => cache.remove(key));
  return {complete:true,user:getCurrentUser()};
}
function requireUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) {
    throw new Error(
      'Akun Google aktif tidak tersedia. Periksa pengaturan akses web app.'
    );
  }

  const emailParts = email.split('@');
  if (emailParts.length !== 2 || emailParts[1] !== 'genius.sch.id') {
    throw new Error(
      'Akses Ruang Math Up hanya tersedia untuk akun sekolah dengan domain @genius.sch.id.'
    );
  }

  return {
    email: email,
    name: emailParts[0],
    photoUrl: '',
    role: 'Guru'
  };
}
function upsertUser_(user) {
  const users = readRows_(SHEET_NAMES.USERS);
  const teachers = readRows_(SHEET_NAMES.TEACHERS);
  const existing = users.find(r =>
    String(r.email || '').trim().toLowerCase() === user.email
  );
  const teacher = teachers.find(r =>
    String(r.email || '').trim().toLowerCase() === user.email
  );
  const now = new Date().toISOString();
  upsertRow_(SHEET_NAMES.USERS, {
    id:existing ? existing.id : Utilities.getUuid(),
    email:user.email,
    name:String(teacher?.name || existing?.name || user.name || ''),
    // Pertahankan referensi foto yang tersimpan; jangan kosongkan saat bootstrap.
    photoUrl:'',
    photoFileId:existing?.photoFileId || '',
    role:existing ? existing.role : 'Guru',
    createdAt:existing ? existing.createdAt : now,
    updatedAt:now
  });
  if (!teacher) {
    upsertRow_(SHEET_NAMES.TEACHERS, {
      id:Utilities.getUuid(),
      email:user.email,
      name:user.name,
      subject:'Matematika',
      status:'Aktif',
      phone:'',
      createdAt:now,
      updatedAt:now
    });
  }
}
// ============================================================
// GOOGLE DRIVE
// ============================================================
function setDriveFolderId(id) {
  if (!id) throw new Error('Drive Folder ID wajib diisi.');
  DriveApp.getFolderById(String(id).trim());
  PropertiesService.getScriptProperties()
    .setProperty('DRIVE_FOLDER_ID',String(id).trim());
  return {ok:true};
}
// Membuat atau mengambil folder anak berdasarkan nama di dalam folder induk.
function ensureRMUChildFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

// Membuat struktur folder tahun ajaran dan kelas 4–12.
// Contoh: createRMUAcademicYear(2026, 2027)
function createRMUAcademicYear(yearStart, yearEnd) {
  const start = Number(yearStart);
  const end = Number(yearEnd);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end !== start + 1) {
    throw new Error('Tahun ajaran harus berurutan, misalnya (2026, 2027).');
  }

  const properties = PropertiesService.getScriptProperties();
  let root = null;
  const rootId = properties.getProperty('RMU_DRIVE_ROOT_ID');
  if (rootId) {
    try { root = DriveApp.getFolderById(rootId); } catch (e) {}
  }
  if (!root) {
    const roots = DriveApp.getFoldersByName('RMU — Drive Materi');
    root = roots.hasNext() ? roots.next() : DriveApp.createFolder('RMU — Drive Materi');
    properties.setProperty('RMU_DRIVE_ROOT_ID', root.getId());
  }

  // DRIVE_FOLDER_ID menunjuk ke folder utama agar tetap kompatibel
  // dengan API materi yang sudah digunakan frontend.
  properties.setProperty('DRIVE_FOLDER_ID', root.getId());

  const yearFolder = ensureRMUChildFolder_(root, 'Tahun Ajaran ' + start + '-' + end);
  const categories = ['Modul', 'Lembar Kerja Murid', 'Asesmen'];
  for (let grade = 4; grade <= 12; grade++) {
    const classFolder = ensureRMUChildFolder_(yearFolder, 'Kelas ' + grade);
    categories.forEach(name => ensureRMUChildFolder_(classFolder, name));
  }

  return {
    ok:true,
    rootName:root.getName(),
    rootUrl:root.getUrl(),
    academicYearFolderName:yearFolder.getName(),
    academicYearFolderUrl:yearFolder.getUrl(),
    classesCreatedOrVerified:9,
    categoryFoldersCreatedOrVerified:27
  };
}

// Menyiapkan struktur materi RMU DI DALAM folder Drive tujuan yang ditentukan.
// Fungsi ini sengaja tidak memakai root ID lama dari Script Properties,
// agar folder tidak dibuat tanpa sengaja di lokasi yang sebelumnya tersimpan.
function setupRMUDriveMaterials() {
  const parentFolderId = '1w6PdzpPR_nnqgb62SoCe5YleqtYt3SHe';
  const parent = DriveApp.getFolderById(parentFolderId);

  // Cari/buat root materi di dalam folder tujuan pengguna.
  const root = ensureRMUChildFolder_(parent, 'RMU — Drive Materi');
  const yearFolder = ensureRMUChildFolder_(root, 'Tahun Ajaran 2026-2027');
  const categories = ['Modul', 'Lembar Kerja Murid', 'Asesmen'];
  let classCount = 0;
  let categoryCount = 0;

  for (let grade = 4; grade <= 12; grade++) {
    const classFolder = ensureRMUChildFolder_(yearFolder, 'Kelas ' + grade);
    classCount++;
    categories.forEach(function(categoryName) {
      ensureRMUChildFolder_(classFolder, categoryName);
      categoryCount++;
    });
  }

  // Simpan folder yang benar agar API materi menggunakan lokasi yang sama.
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('RMU_DRIVE_ROOT_ID', root.getId());
  properties.setProperty('DRIVE_FOLDER_ID', root.getId());

  const result = {
    ok: true,
    parentFolderName: parent.getName(),
    parentFolderUrl: parent.getUrl(),
    rootName: root.getName(),
    rootId: root.getId(),
    rootUrl: root.getUrl(),
    academicYearFolderName: yearFolder.getName(),
    academicYearFolderUrl: yearFolder.getUrl(),
    classesCreatedOrVerified: classCount,
    categoryFoldersCreatedOrVerified: categoryCount
  };

  // Tampilkan hasil di Execution log dan simpan sebagai hasil fungsi.
  console.log('setupRMUDriveMaterials RESULT: ' + JSON.stringify(result));
  Logger.log('setupRMUDriveMaterials RESULT: ' + JSON.stringify(result));
  return result;
}

// Pemeriksaan akses saja; tidak membuat folder tambahan.
function cekFolderTujuanRMU() {
  const id = '1w6PdzpPR_nnqgb62SoCe5YleqtYt3SHe';
  const folder = DriveApp.getFolderById(id);
  const result = {
    ok: true,
    folderName: folder.getName(),
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    canAccess: true
  };
  console.log('cekFolderTujuanRMU RESULT: ' + JSON.stringify(result));
  Logger.log('cekFolderTujuanRMU RESULT: ' + JSON.stringify(result));
  return result;
}

function getDriveMaterials() {
  requireUser_();
  const id = PropertiesService.getScriptProperties()
    .getProperty('DRIVE_FOLDER_ID');
  if (!id) {
    return {
      configured:false,folderName:'',folderUrl:'',
      folders:[],files:[],truncated:false
    };
  }

  let folder;
  try {
    folder = DriveApp.getFolderById(id);
    folder.getName();
  } catch (e) {
    throw new Error('Folder Drive Materi tidak dapat diakses. Periksa DRIVE_FOLDER_ID dan pastikan akun pemilik Apps Script masih memiliki akses ke folder tersebut.');
  }

  const contents = listDriveFolderContents_(folder);
  return {
    configured:true,
    folderName:folder.getName(),
    folderUrl:folder.getUrl(),
    folders:contents.folders,
    files:contents.files,
    truncated:contents.truncated,
    itemLimit:contents.itemLimit
  };
}

// Mengambil isi satu folder saja. Folder anak dimuat saat pengguna membukanya.
function getDriveFolderContents(folderId) {
  requireUser_();
  const rootId = PropertiesService.getScriptProperties()
    .getProperty('DRIVE_FOLDER_ID');
  if (!rootId) throw new Error('Folder Drive Materi belum dikonfigurasi.');

  const requestedId = String(folderId || '').trim();
  if (!requestedId) throw new Error('ID folder wajib diisi.');

  let rootFolder, targetFolder;
  try {
    rootFolder = DriveApp.getFolderById(rootId);
    targetFolder = DriveApp.getFolderById(requestedId);
    rootFolder.getName();
    targetFolder.getName();
  } catch (e) {
    throw new Error('Folder tidak dapat diakses.');
  }

  // Pastikan ID yang diminta benar-benar berada di dalam folder materi.
  if (!isDriveFolderWithinRoot_(targetFolder, rootId)) {
    throw new Error('Folder yang diminta bukan bagian dari Drive Materi.');
  }

  return listDriveFolderContents_(targetFolder);
}

function isDriveFolderWithinRoot_(targetFolder, rootId) {
  const queue = [{folder:targetFolder,depth:0}];
  const visited = {};
  const maxDepth = 12;
  const maxFolders = 100;
  let checked = 0;

  while (queue.length && checked < maxFolders) {
    const current = queue.shift();
    const id = current.folder.getId();
    if (id === rootId) return true;
    if (visited[id] || current.depth >= maxDepth) continue;
    visited[id] = true;
    checked++;

    const parents = current.folder.getParents();
    while (parents.hasNext()) {
      queue.push({folder:parents.next(),depth:current.depth + 1});
    }
  }
  return false;
}

function listDriveFolderContents_(folder) {
  const files = [];
  const folders = [];
  // Keep explicit per-folder limits so a single large folder cannot stall the request.
  const maxFiles = 200;
  const maxFolders = 200;
  let truncated = false;

  const fileIterator = folder.getFiles();
  while (fileIterator.hasNext()) {
    const file = fileIterator.next();
    if (file.isTrashed()) continue;
    if (files.length >= maxFiles) {
      truncated = true;
      break;
    }
    files.push({
      id:file.getId(),
      name:file.getName(),
      mimeType:file.getMimeType(),
      size:file.getSize(),
      updatedAt:file.getLastUpdated().toISOString(),
      url:file.getUrl()
    });
  }

  const folderIterator = folder.getFolders();
  while (folderIterator.hasNext()) {
    const child = folderIterator.next();
    if (child.isTrashed()) continue;
    if (folders.length >= maxFolders) {
      truncated = true;
      break;
    }
    folders.push({id:child.getId(),name:child.getName()});
  }

  files.sort((a,b) =>
    String(a.name).localeCompare(String(b.name),undefined,{numeric:true,sensitivity:'base'})
  );
  folders.sort((a,b) =>
    String(a.name).localeCompare(String(b.name),undefined,{numeric:true,sensitivity:'base'})
  );

  return {folders,files,truncated,itemLimit:maxFiles};
}
// ============================================================
// SPREADSHEET
// ============================================================
// Cache objek Spreadsheet hanya selama satu eksekusi Apps Script.
// Beberapa fungsi bootstrap membaca banyak sheet; membuka spreadsheet berulang
// kali dalam permintaan yang sama menambah latensi tanpa memberi manfaat.
let _spreadsheetCacheId = '';
let _spreadsheetCache = null;
function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties()
    .getProperty('SPREADSHEET_ID');
  if (!id) {
    throw new Error(
      'SPREADSHEET_ID belum diatur. Jalankan setSpreadsheetId("ID_SHEET").'
    );
  }
  if (_spreadsheetCache && _spreadsheetCacheId === id) {
    return _spreadsheetCache;
  }
  _spreadsheetCache = SpreadsheetApp.openById(id);
  _spreadsheetCacheId = id;
  return _spreadsheetCache;
}
function setSpreadsheetId(id) {
  if (!id) throw new Error('Spreadsheet ID wajib diisi.');
  PropertiesService.getScriptProperties()
    .setProperty('SPREADSHEET_ID',String(id).trim());
  return {ok:true};
}

// Jalankan satu kali oleh pemilik project di editor Apps Script untuk
// memberikan izin pengiriman email sebelum fitur notifikasi dipakai.
function authorizeEmailNotifications() {
  const quota = MailApp.getRemainingDailyQuota();
  return {authorized:true,remainingDailyRecipients:quota};
}
// ============================================================
// UTILITAS TANGGAL DAN WAKTU
// ============================================================
function isValidIsoDate_(value) {
  const date = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0,10) === date;
}
function dayNameId_(dateString) {
  const parts = String(dateString).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error('Format tanggal tidak valid.');
  }
  const d = new Date(parts[0],parts[1]-1,parts[2]);
  return [
    'Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'
  ][d.getDay()];
}
function timeToMinutes_(value) {
  if (value === null || value === undefined || value === '') {
    return NaN;
  }
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return NaN;
    return value.getHours() * 60 + value.getMinutes();
  }
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return NaN;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return NaN;
  }
  return hour * 60 + minute;
}
function minutesToTime_(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return '';
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return String(hour).padStart(2,'0') + ':' +
    String(minute).padStart(2,'0');
}
function minutesToTimeSafe_(minutes) {
  return minutesToTime_(minutes);
}
function overlaps_(startA,endA,startB,endB) {
  const a1 = timeToMinutes_(startA);
  const a2 = timeToMinutes_(endA);
  const b1 = timeToMinutes_(startB);
  const b2 = timeToMinutes_(endB);
  return (
    [a1,a2,b1,b2].every(Number.isFinite) &&
    a1 < b2 &&
    a2 > b1
  );
}
// ============================================================
// MEMBACA DAN MENYIMPAN DATA SHEET
// ============================================================
function readRows_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet
    .getRange(1,1,sheet.getLastRow(),sheet.getLastColumn())
    .getValues();
  const headers = values.shift();
  return values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => headers.reduce((obj,key,i) => {
      const cell = row[i];
      if (
        (key === 'date' || key === 'eventDate') &&
        cell instanceof Date
      ) {
        obj[key] = Utilities.formatDate(
          cell,
          Session.getScriptTimeZone() || 'Asia/Jakarta',
          'yyyy-MM-dd'
        );
      } else if (
        (key === 'startTime' || key === 'endTime') &&
        cell instanceof Date
      ) {
        obj[key] = Utilities.formatDate(
          cell,
          Session.getScriptTimeZone() || 'Asia/Jakarta',
          'HH:mm'
        );
      } else {
        obj[key] = cell;
      }
      return obj;
    },{}));
}
function findRow_(sheetName,id) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet
    .getRange(1,1,sheet.getLastRow(),sheet.getLastColumn())
    .getValues();
  const headers = values.shift();
  const idIndex = headers.indexOf('id');
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      return {
        rowNumber:i + 2,
        data:headers.reduce((obj,key,j) => {
          obj[key] = values[i][j];
          return obj;
        },{})
      };
    }
  }
  return null;
}
function upsertRow_(sheetName,data) {
  const existing = findRow_(sheetName,data.id);
  if (existing) {
    return updateRow_(sheetName,existing.rowNumber,data);
  }
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastColumn() < 1) {
    throw new Error('Sheet ' + sheetName + ' belum disiapkan.');
  }
  // Gunakan header aktual: migrasi menambahkan kolom baru di ujung sheet,
  // sehingga urutannya bisa berbeda dari HEADERS pada versi kode terbaru.
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn())
    .getDisplayValues()[0].map(value => String(value || '').trim());
  sheet.appendRow(headers.map(key => data[key] ?? ''));
  return {ok:true,data};
}
function updateRow_(sheetName,rowNumber,data) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastColumn() < 1) {
    throw new Error('Sheet ' + sheetName + ' belum disiapkan.');
  }
  // Baca urutan kolom yang nyata dan pertahankan nilai kolom yang tidak
  // disertakan oleh pemanggil agar kolom lama/ekstensi tidak terhapus.
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn())
    .getDisplayValues()[0].map(value => String(value || '').trim());
  const currentValues = sheet.getRange(rowNumber,1,1,headers.length)
    .getValues()[0];
  const values = headers.map((key,index) =>
    Object.prototype.hasOwnProperty.call(data,key)
      ? (data[key] ?? '')
      : currentValues[index]
  );
  sheet.getRange(rowNumber,1,1,headers.length).setValues([values]);
  return {ok:true,data};
}
function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
