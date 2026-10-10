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
    getEffectiveSchedule:'getEffectiveSchedule', saveTodo:'saveTodo', updateTodo:'updateTodo',
    deleteTodo:'deleteTodo', toggleTodo:'toggleTodo',
    saveTeacher:'saveTeacher', saveSchedule:'saveSchedule', updateSchedule:'updateSchedule',
    deleteSchedule:'deleteSchedule', saveEvent:'saveEvent', updateEvent:'updateEvent', deleteEvent:'deleteEvent',
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
  const allSchedule = readRows_(SHEET_NAMES.SCHEDULE);
  const approvedSubs = readRows_(SHEET_NAMES.SUBSTITUTIONS).filter(r => String(r.status || '') === 'Disetujui');
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
  const effectiveSchedule = buildEffectiveSchedule_(allSchedule, approvedSubs, today);
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
  const id = todo.id || Utilities.getUuid();
  if (todo.id) {
    const existing = findRow_(SHEET_NAMES.TODO, id);
    if (!existing || String(existing.data.teacherEmail || '').toLowerCase() !== user.email) throw new Error('Tugas tidak ditemukan.');
    return updateRow_(SHEET_NAMES.TODO, existing.rowNumber, {
      ...existing.data,
      teacherEmail: user.email,
      title: String(todo.title || '').trim(),
      description: String(todo.description || ''),
      dueAt: String(todo.dueAt || ''),
      priority: todo.priority || 'Sedang',
      done: Boolean(todo.done),
      updatedAt: new Date().toISOString()
    });
  }
  return upsertRow_(SHEET_NAMES.TODO, {
    id, teacherEmail: user.email, title: String(todo.title || '').trim(),
    description: String(todo.description || ''), dueAt: String(todo.dueAt || ''), priority: todo.priority || 'Sedang',
    done: Boolean(todo.done), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
}

function updateTodo(todo) {
  return saveTodo(todo);
}

function deleteTodo(id) {
  const user = requireUser_();
  const row = findRow_(SHEET_NAMES.TODO, id);
  if (!row || String(row.data.teacherEmail || '').toLowerCase() !== user.email) throw new Error('Tugas tidak ditemukan.');
  const sheet = getSpreadsheet_().getSheetByName(SHEET_NAMES.TODO);
  sheet.deleteRow(row.rowNumber);
  return {ok:true,id};
}

function toggleTodo(id, done) {
  const user = requireUser_();
  const row = findRow_(SHEET_NAMES.TODO, id);
  if (!row || String(row.data.teacherEmail || '').toLowerCase() !== user.email) throw new Error('Tugas tidak ditemukan.');
  return updateRow_(SHEET_NAMES.TODO, row.rowNumber, {...row.data, done: Boolean(done), updatedAt: new Date().toISOString()});
}

function saveTeacher(teacher) {
  const user = requireUser_();
  const email = String(teacher.email || '').trim().toLowerCase();
  if (email !== user.email) throw new Error('Guru hanya dapat memperbarui profilnya sendiri.');
  setupSheets();

  const existing = readRows_(SHEET_NAMES.TEACHERS).find(r => String(r.email || '').trim().toLowerCase() === user.email);
  const now = new Date().toISOString();
  const data = {
    id: existing?.id || teacher.id || Utilities.getUuid(),
    email: user.email,
    name: String(teacher.name || '').trim(),
    subject: String(teacher.subject || 'Matematika').trim(),
    status: teacher.status || 'Aktif',
    createdAt: existing?.createdAt || teacher.createdAt || now,
    updatedAt: now
  };

  if (existing) {
    const row = findRow_(SHEET_NAMES.TEACHERS, existing.id);
    return updateRow_(SHEET_NAMES.TEACHERS, row.rowNumber, data);
  }
  return upsertRow_(SHEET_NAMES.TEACHERS, data);
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

function updateSchedule(item) {
  const user = requireUser_();
  setupSheets();
  if (!item || !item.id) throw new Error('ID jadwal wajib diisi.');
  const row = findRow_(SHEET_NAMES.SCHEDULE, item.id);
  if (!row) throw new Error('Jadwal tidak ditemukan.');
  if (String(row.data.teacherEmail || '').toLowerCase() !== user.email) throw new Error('Anda hanya dapat mengedit jadwal milik Anda sendiri.');

  const startTime = String(item.startTime || '').trim();
  const endTime = String(item.endTime || '').trim();
  if (!item.day || !startTime || !endTime || timeToMinutes_(startTime) >= timeToMinutes_(endTime)) {
    throw new Error('Hari dan jam jadwal tidak valid.');
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
  getSpreadsheet_().getSheetByName(SHEET_NAMES.SCHEDULE).deleteRow(row.rowNumber);
  return {ok:true, id:String(id)};
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

function updateEvent(event) {
  const user = requireUser_(); setupSheets();
  if (!event || !event.id) throw new Error('ID agenda wajib diisi.');
  const row = findRow_(SHEET_NAMES.EVENTS, event.id);
  if (!row) throw new Error('Agenda tidak ditemukan.');
  if (String(row.data.createdBy || '').trim().toLowerCase() !== user.email) throw new Error('Anda hanya dapat mengedit agenda yang Anda buat sendiri.');
  const title=String(event.title||'').trim(), eventDate=String(event.eventDate||'').trim();
  const startTime=String(event.startTime||'').trim(), endTime=String(event.endTime||'').trim();
  if(!title)throw new Error('Nama agenda wajib diisi.');
  if(!eventDate)throw new Error('Tanggal agenda wajib diisi.');
  if((startTime&&!Number.isFinite(timeToMinutes_(startTime)))||(endTime&&!Number.isFinite(timeToMinutes_(endTime))))throw new Error('Format jam agenda tidak valid.');
  if(startTime&&endTime&&timeToMinutes_(startTime)>=timeToMinutes_(endTime))throw new Error('Jam selesai harus lebih besar dari jam mulai.');
  return updateRow_(SHEET_NAMES.EVENTS,row.rowNumber,{...row.data,title,description:String(event.description||''),eventDate,startTime,endTime,type:String(event.type||'Sekolah'),updatedAt:new Date().toISOString()});
}
function deleteEvent(id) {
  const user=requireUser_(); setupSheets();
  if(!id)throw new Error('ID agenda wajib diisi.');
  const row=findRow_(SHEET_NAMES.EVENTS,id);
  if(!row)throw new Error('Agenda tidak ditemukan.');
  if(String(row.data.createdBy||'').trim().toLowerCase()!==user.email)throw new Error('Anda hanya dapat menghapus agenda yang Anda buat sendiri.');
  getSpreadsheet_().getSheetByName(SHEET_NAMES.EVENTS).deleteRow(row.rowNumber);
  return {ok:true,id:String(id)};
}

function findSubstituteCandidates(request) {
  const user=requireUser_(); setupSheets(); request=request||{};
  const date=String(request.date||'').trim(), startTime=String(request.startTime||'').trim(), endTime=String(request.endTime||'').trim();
  const rs=timeToMinutes_(startTime), re=timeToMinutes_(endTime);
  if(!date||!startTime||!endTime)throw new Error('Tanggal, jam mulai, dan jam selesai wajib diisi.');
  if(!Number.isFinite(rs)||!Number.isFinite(re)||rs>=re)throw new Error('Rentang waktu pengganti tidak valid.');
  const absent=String(request.absentTeacherEmail||user.email).trim().toLowerCase();
  if(absent!==user.email)throw new Error('Guru hanya dapat mencari pengganti untuk jadwalnya sendiri.');
  const day=String(request.day||dayNameId_(date)).trim().toLowerCase();
  const schedules=readRows_(SHEET_NAMES.SCHEDULE);
  const events=readRows_(SHEET_NAMES.EVENTS).filter(e=>String(e.eventDate||'').trim()===date);
  const subs=readRows_(SHEET_NAMES.SUBSTITUTIONS).filter(s=>String(s.date||'').trim()===date&&String(s.status||'Diajukan').trim().toLowerCase()!=='ditolak');
  const teachers=readRows_(SHEET_NAMES.TEACHERS).filter(t=>String(t.status||'Aktif').trim().toLowerCase()!=='nonaktif'&&String(t.email||'').trim());
  const agenda=events.map(e=>{const a=String(e.startTime||'').trim(),b=String(e.endTime||'').trim();if(!a&&!b)return {start:0,end:1440};const x=timeToMinutes_(a),y=timeToMinutes_(b);if(!Number.isFinite(x)||!Number.isFinite(y)||x>=y)return {start:0,end:1440};return {start:x,end:y};});
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

function isTeacherAvailableForInterval_(teacherEmail,date,startTime,endTime,excludeSubstitutionId) {
  const email=String(teacherEmail||'').trim().toLowerCase(), start=timeToMinutes_(startTime), end=timeToMinutes_(endTime);
  if(!email||!date||!Number.isFinite(start)||!Number.isFinite(end)||start>=end)return false;
  const day=dayNameId_(date), schedules=readRows_(SHEET_NAMES.SCHEDULE);
  if(schedules.some(s=>String(s.teacherEmail||'').trim().toLowerCase()===email&&String(s.day||'').trim().toLowerCase()===String(day).toLowerCase()&&overlaps_(s.startTime,s.endTime,startTime,endTime)))return false;
  const events=readRows_(SHEET_NAMES.EVENTS);
  if(events.some(e=>{if(String(e.eventDate||'').trim()!==String(date).trim())return false;const a=String(e.startTime||'').trim(),b=String(e.endTime||'').trim();if(!a&&!b)return true;if(!a||!b||!Number.isFinite(timeToMinutes_(a))||!Number.isFinite(timeToMinutes_(b))||timeToMinutes_(a)>=timeToMinutes_(b))return true;return overlaps_(a,b,startTime,endTime);}))return false;
  const subs=readRows_(SHEET_NAMES.SUBSTITUTIONS);
  if(subs.some(s=>{if(String(s.substituteTeacherEmail||'').trim().toLowerCase()!==email||String(s.date||'').trim()!==String(date).trim())return false;if(excludeSubstitutionId&&String(s.id)===String(excludeSubstitutionId))return false;if(String(s.status||'Diajukan').trim().toLowerCase()==='ditolak')return false;return overlaps_(s.startTime,s.endTime,startTime,endTime);}))return false;
  return true;
}

function saveSubstitution(item) {
  const user=requireUser_();setupSheets();if(!item||typeof item!=='object')throw new Error('Data pengajuan tidak valid.');
  const absent=String(item.absentTeacherEmail||user.email).trim().toLowerCase(), substitute=String(item.substituteTeacherEmail||'').trim().toLowerCase();
  const date=String(item.date||'').trim(), startTime=String(item.startTime||'').trim(), endTime=String(item.endTime||'').trim();
  if(absent!==user.email)throw new Error('Pengajuan hanya dapat dibuat oleh guru yang izin.');
  if(!substitute||substitute===absent)throw new Error('Guru pengganti tidak valid.');
  const start=timeToMinutes_(startTime),end=timeToMinutes_(endTime);
  if(!date||!Number.isFinite(start)||!Number.isFinite(end)||start>=end)throw new Error('Tanggal dan rentang jam pengganti tidak valid.');
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Sistem sedang memproses pengajuan lain. Silakan coba lagi.');
  try{
    const teacher=readRows_(SHEET_NAMES.TEACHERS).find(t=>String(t.email||'').trim().toLowerCase()===substitute&&String(t.status||'Aktif').trim().toLowerCase()!=='nonaktif');
    if(!teacher)throw new Error('Guru pengganti tidak ditemukan atau tidak aktif.');
    if(!isTeacherAvailableForInterval_(substitute,date,startTime,endTime,null))throw new Error('Guru pengganti memiliki jadwal, agenda, atau penugasan lain yang bertabrakan.');
    const existing=readRows_(SHEET_NAMES.SUBSTITUTIONS).some(s=>String(s.date||'').trim()===date&&String(s.absentTeacherEmail||'').trim().toLowerCase()===absent&&String(s.status||'Diajukan').trim().toLowerCase()!=='ditolak'&&overlaps_(s.startTime,s.endTime,startTime,endTime));
    if(existing)throw new Error('Anda sudah memiliki permintaan pengganti yang bertumpang tindih pada waktu tersebut.');
    const now=new Date().toISOString();
    return upsertRow_(SHEET_NAMES.SUBSTITUTIONS,{id:Utilities.getUuid(),date,startTime,endTime,className:String(item.className||''),topic:String(item.topic||''),room:String(item.room||''),absentTeacherEmail:absent,substituteTeacherEmail:substitute,reason:String(item.reason||''),status:'Diajukan',createdBy:user.email,createdAt:now,updatedAt:now});
  }finally{lock.releaseLock();}
}

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

function minutesToTimeSafe_(minutes) {
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
}

function getEffectiveSchedule(date) {
  requireUser_();
  setupSheets();
  const targetDate = String(date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) throw new Error('Format tanggal tidak valid.');
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

function respondSubstitution(id,response) {
  const user=requireUser_();setupSheets();const action=String(response||'').trim().toLowerCase();
  if(action!=='terima'&&action!=='tolak')throw new Error('Respons tidak valid.');
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Sistem sedang memproses permintaan lain. Silakan coba lagi.');
  try{
    const row=findRow_(SHEET_NAMES.SUBSTITUTIONS,id);if(!row)throw new Error('Permintaan pergantian tidak ditemukan.');
    const data=row.data, email=String(data.substituteTeacherEmail||'').trim().toLowerCase();
    if(email!==user.email)throw new Error('Hanya guru yang ditunjuk yang dapat merespons permintaan ini.');
    if(String(data.status||'Diajukan').trim().toLowerCase()!=='diajukan')throw new Error('Permintaan ini sudah diproses sebelumnya.');
    if(action==='terima'&&!isTeacherAvailableForInterval_(email,String(data.date||''),String(data.startTime||''),String(data.endTime||''),data.id))throw new Error('Permintaan tidak dapat diterima karena jadwal, agenda, atau penugasan lain bertabrakan.');
    return updateRow_(SHEET_NAMES.SUBSTITUTIONS,row.rowNumber,{...data,status:action==='terima'?'Disetujui':'Ditolak',updatedAt:new Date().toISOString()});
  }finally{lock.releaseLock();}
}

function getCurrentUser() {
  const user = requireUser_();
  setupSheets();
  const teacher = readRows_(SHEET_NAMES.TEACHERS).find(r => String(r.email || '').toLowerCase() === user.email);
  if (teacher && String(teacher.name || '').trim()) user.name = String(teacher.name).trim();
  return user;
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
  return values.filter(row => row.some(cell => cell !== '')).map(row => headers.reduce((obj, key, i) => {
    const cell = row[i];
    if ((key === 'startTime' || key === 'endTime') && cell instanceof Date) {
      obj[key] = Utilities.formatDate(cell, Session.getScriptTimeZone() || 'Asia/Jakarta', 'HH:mm');
    } else {
      obj[key] = cell;
    }
    return obj;
  }, {}));
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