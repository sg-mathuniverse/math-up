import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import {
  Bell, CalendarDays, CheckCircle2, ChevronDown, CirclePlus, Clock3,
  FileText, LayoutDashboard, ListTodo, Menu, MoreHorizontal, Search,
  Settings, Users, X, BookOpen, Sparkles, Mail, HardDrive
} from "lucide-react";

const schedule = [
  {time:"07:00", end:"08:20", className:"VIII-A", topic:"Persamaan Linear Dua Variabel", room:"R. 201"},
  {time:"09:00", end:"10:20", className:"IX-B", topic:"Peluang", room:"R. 104"},
  {time:"11:00", end:"12:20", className:"VII-C", topic:"Aritmetika Sosial", room:"R. 203"}
];

function App(){
  const [active,setActive]=useState("Dashboard");
  const [authChecked,setAuthChecked]=useState(false);
  const [authUser,setAuthUser]=useState(null);
  const [todos,setTodos]=useState([]);
  const [menuOpen,setMenuOpen]=useState(false);
  const [showTodo,setShowTodo]=useState(false);
  const [editingTodo,setEditingTodo]=useState(null);
  const [confirmTodo,setConfirmTodo]=useState(null);
  const [query,setQuery]=useState("");
  const [user,setUser]=useState(null);
  const [dashboard,setDashboard]=useState({schedule:[],events:[]});
  const [loading,setLoading]=useState(true);
  const [apiError,setApiError]=useState("");
  const [todoActionLoading,setTodoActionLoading]=useState("");
  const [substitutionNotifications,setSubstitutionNotifications]=useState([]);

  useEffect(()=>{
    api.getCurrentUser().then(u=>{
      setAuthUser(u||null);
      if(u?.email){
        return Promise.all([api.getBootstrap(),api.getSubstitutionRequests()]).then(([d,requests])=>{
          setTodos(d?.todos||[]);
          setUser(u);
          setDashboard({schedule:d?.schedule||[],events:(d?.events||[]).map(x=>({...x,eventDate:normalizeCalendarDate(x.eventDate)}))});
          setSubstitutionNotifications(Array.isArray(requests?.requests)?requests.requests:(Array.isArray(requests)?requests:[]));
        });
      }
    }).catch(e=>setApiError(e.message||String(e))).finally(()=>{
      setAuthChecked(true);
      setLoading(false);
    });
  },[]);

  const filteredTodos=useMemo(()=>todos.filter(t=>String(t?.title||"").toLowerCase().includes(query.toLowerCase())),[todos,query]);

  if(!authChecked || loading) return <LoadingScreen/>;

  if(!authUser?.email) return <LoginScreen error={apiError}/>;

  const toggleTodo=async id=>{const t=todos.find(x=>x.id===id);if(!t||todoActionLoading)return;setTodoActionLoading("toggle:"+id);setApiError("");try{await api.toggleTodo(id,!t.done);setTodos(ts=>ts.map(x=>x.id===id?{...x,done:!x.done}:x));}catch(e){setApiError(e.message||String(e));}finally{setTodoActionLoading("");}};
  const requestTodoToggle=id=>{const t=todos.find(x=>x.id===id);if(t&&!todoActionLoading)setConfirmTodo(t);};
  const confirmTodoToggle=()=>{if(!confirmTodo)return;const id=confirmTodo.id;toggleTodo(id);setConfirmTodo(null)};

  return <div className="app">
    <aside className={menuOpen?"sidebar open":"sidebar"}>
      <div className="brand"><div className="brand-mark">∑</div><div><strong>Math Up</strong><span>Teacher Workspace</span></div></div>
      <nav>
        <Nav icon={<LayoutDashboard size={19}/>} label="Dashboard" active={active==="Dashboard"} onClick={()=>setActive("Dashboard")}/>
        <Nav icon={<CalendarDays size={19}/>} label="Jadwal Mengajar" active={active==="Jadwal Mengajar"} onClick={()=>setActive("Jadwal Mengajar")}/>
        <Nav icon={<Users size={19}/>} label="Guru Pengganti" active={active==="Guru Pengganti"} onClick={()=>setActive("Guru Pengganti")}/>
        <Nav icon={<ListTodo size={19}/>} label="To-Do" active={active==="To-Do"} onClick={()=>setActive("To-Do")} todoCount={todos.filter(t=>!t.done).length}/>
        <Nav icon={<CalendarDays size={19}/>} label="Kalender Akademik" active={active==="Kalender Akademik"} onClick={()=>setActive("Kalender Akademik")}/>
        <Nav icon={<FileText size={19}/>} label="Drive Materi" active={active==="Drive Materi"} onClick={()=>setActive("Drive Materi")}/>
        <Nav icon={<Users size={19}/>} label="Guru Matematika" active={active==="Guru Matematika"} onClick={()=>setActive("Guru Matematika")}/>
      </nav>
      <div className="sidebar-bottom">
        <Nav icon={<Settings size={19}/>} label="Pengaturan" active={active==="Pengaturan"} onClick={()=>setActive("Pengaturan")}/>
        <div className="profile-mini"><div className="avatar">{user?.photoUrl?<img src={user.photoUrl} alt={user.name||"Profil"} />:initials(user?.name||user?.email||"?")}</div><div><b>{user?.name||"Memuat profil..."}</b><span>{user?.email||"Akun Google"}</span></div><MoreHorizontal size={17}/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={()=>setMenuOpen(v=>!v)}><Menu size={20}/></button>
        <div className="crumb"><span>Workspace</span><b>/</b><strong>{active}</strong></div>
        <div className="top-actions">
          <form className="search google-search" action="https://www.google.com/search" method="get" target="_blank"><Search size={17}/><input name="q" placeholder="Cari di Google..." aria-label="Cari di Google" /></form>
          <a className="icon-btn top-link" href="https://mail.google.com/" target="_blank" rel="noreferrer" title="Buka Gmail" aria-label="Buka Gmail"><Mail size={19}/></a>
          <a className="icon-btn top-link" href="https://drive.google.com/" target="_blank" rel="noreferrer" title="Buka Google Drive" aria-label="Buka Google Drive"><HardDrive size={19}/></a>
          <button className="icon-btn notification-btn" onClick={()=>setActive("Guru Pengganti")} title="Notifikasi guru pengganti" aria-label="Notifikasi guru pengganti"><Bell size={19}/>{substitutionNotifications.length>0&&<i></i>}{substitutionNotifications.length>0&&<em>{substitutionNotifications.length>9?"9+":substitutionNotifications.length}</em>}</button>
          <button className="user-chip" onClick={()=>setMenuOpen(v=>v)}><div className="avatar small">{user?.photoUrl?<img src={user.photoUrl} alt={user.name||"Profil"} />:initials(user?.name||user?.email||"?")}</div><ChevronDown size={15}/></button>
        </div>
      </header>

      {active==="Dashboard" ? <Dashboard todos={filteredTodos} toggleTodo={requestTodoToggle} todoActionLoading={todoActionLoading} schedule={dashboard.schedule} events={dashboard.events} user={user} /> :
       active==="Jadwal Mengajar" ? <SchedulePage user={user} /> : active==="Guru Pengganti" ? <SubstitutePage user={user} /> :
       active==="Kalender Akademik" ? <CalendarPage /> :
       active==="Drive Materi" ? <DrivePage /> :
       active==="Guru Matematika" ? <TeachersPage user={user} onUserUpdated={setUser} /> :
       active==="Pengaturan" ? <SettingsPage /> :
       active==="To-Do" ? <TodoPage todos={filteredTodos} toggleTodo={requestTodoToggle} actionLoading={todoActionLoading} onAdd={()=>{if(todoActionLoading)return;setEditingTodo(null);setShowTodo(true)}} onEdit={t=>{if(todoActionLoading)return;setEditingTodo(t);setShowTodo(true)}} onDelete={async t=>{if(!window.confirm("Hapus tugas ini?"))return;setTodoActionLoading("delete:"+String(t.id));setApiError("");try{await api.deleteTodo(t.id);setTodos(ts=>ts.filter(x=>x.id!==t.id));}catch(e){setApiError(e.message||String(e));}finally{setTodoActionLoading("");}}} /> :
       <Placeholder title={active} />}

      {apiError && <div className="card" style={{margin:"16px"}}>{apiError}</div>}
      {confirmTodo&&<div className="modal-backdrop"><div className="modal confirm-modal"><div className="modal-head"><div><h2>{confirmTodo.done?"Buka kembali tugas?":"Konfirmasi tugas selesai"}</h2><p>{confirmTodo.done?"Tugas ini akan dikembalikan ke daftar tugas aktif.":"Pastikan tugas ini benar-benar sudah selesai dikerjakan."}</p></div><button className="icon-btn" onClick={()=>{if(!todoActionLoading)setConfirmTodo(null)}} disabled={!!todoActionLoading}><X/></button></div><div className="confirm-task"><b>{confirmTodo.title}</b><span>{confirmTodo.description||confirmTodo.desc||"Tanpa deskripsi"}</span></div><div className="modal-actions"><button className="secondary" onClick={()=>setConfirmTodo(null)} disabled={!!todoActionLoading}>Batal</button><button className="primary" onClick={confirmTodoToggle} disabled={!!todoActionLoading}>{todoActionLoading?<><span className="button-spinner"></span>Memproses...</>:confirmTodo.done?"Buka kembali":"Ya, sudah selesai"}</button></div></div></div>}
      {showTodo && <TodoModal initial={editingTodo} saving={todoActionLoading==="save"}  onClose={()=>{setShowTodo(false);setEditingTodo(null)}} onSave={async t=>{setApiError("");setTodoActionLoading("save");try{await api.saveTodo({id:editingTodo?.id,title:t.title,description:t.desc,dueAt:t.due,priority:t.priority,done:editingTodo?.done||false});const fresh=await api.getBootstrap();setTodos(fresh?.todos||[]);setShowTodo(false);setEditingTodo(null);}catch(e){setApiError(e.message||String(e));}finally{setTodoActionLoading("");}}}/>} 
    </main>
  </div>
}


function LoadingScreen(){
  return <div className="auth-screen"><div className="auth-card loading-card"><div className="brand-mark">∑</div><div className="loading-spinner" aria-hidden="true"></div><div className="eyebrow loading-eyebrow">Menyiapkan ruang kerja</div><h1>Math Up</h1><p>Memuat profil, jadwal, tugas, dan agenda Anda. Mohon tunggu sampai Math Up selesai dimuat.</p><div className="loading-track"><span></span></div><small>Jangan tutup halaman ini selama proses pemuatan.</small></div></div>;
}

function LoginScreen({error}){
  const loginUrl=(import.meta.env.VITE_APPS_SCRIPT_URL||"").replace(/\/$/,"");
  return <div className="auth-screen"><div className="auth-card">
    <div className="brand-mark">∑</div>
    <div className="eyebrow">Teacher Workspace</div>
    <h1>Masuk ke Math Up</h1>
    <p>Gunakan akun Google sekolah Anda. Math Up akan mengambil identitas akun secara aman dari Google Apps Script.</p>
    {error&&<div className="auth-error">{error}</div>}
    <a className="google-login" href={loginUrl} target="_blank" rel="noreferrer">
      <span className="google-g">G</span> Masuk dengan Google
    </a>
    <p className="auth-hint">Setelah Google selesai memverifikasi akun, kembali ke tab Math Up lalu muat ulang halaman.</p>
  </div></div>;
}

function initials(value){return String(value||"?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"?";}

function formatTime(value){
  if(value==null||value==="") return "-";
  const s=String(value);
  const iso=s.match(/T(\d{2}):(\d{2})/);
  if(iso) return `${iso[1]}:${iso[2]}`;
  const time=s.match(/(\d{1,2}):(\d{2})/);
  if(time) return `${time[1].padStart(2,"0")}:${time[2]}`;
  return s;
}

function normalizeCalendarDate(value){
  if(value==null||value==="") return "";
  const s=String(value).trim();
  if(/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return s;
  const match=s.match(/^(\\d{4})-(\\d{2})-(\\d{2})T/);
  if(match && !/[zZ]|[+-]\\d{2}:?\\d{2}$/.test(s)) return `${match[1]}-${match[2]}-${match[3]}`;
  const date=new Date(s);
  if(Number.isNaN(date.getTime())) return s.slice(0,10);
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const map=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDate(value){
  if(value==null||value==="") return "-";
  const s=String(value).trim();
  const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  let date=null;
  if(iso) date=new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3]));
  else if(/^\d{4}-\d{2}-\d{2}$/.test(s)) date=new Date(`${s}T00:00:00`);
  else return s;
  if(Number.isNaN(date.getTime())) return s;
  return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"long",year:"numeric"}).format(date);
}

function InlineLoading({text="Memuat data..."}){return <div className="card loading-inline"><div className="loading-spinner small-spinner" aria-hidden="true"></div><div><b>{text}</b><span>Mohon tunggu sebentar...</span></div></div>}

function Nav({icon,label,active,onClick,todoCount=0}){return <button className={active?"nav active":"nav"} onClick={onClick}>{icon}<span>{label}</span>{label==="To-Do"&&todoCount>0&&<em>{todoCount}</em>}</button>}

function Dashboard({todos,toggleTodo,schedule,events,user}){
 const activeSchedule=(schedule||[]).slice().sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)));
 const activeEvents=(events||[]).slice().sort((a,b)=>String(a.eventDate).localeCompare(String(b.eventDate))).slice(0,3);
 const priorityRank={Tinggi:0,Sedang:1,Rendah:2};
 const activeTodos=(todos||[]).slice().sort((a,b)=>{
   const ad=todoDueTimestamp(a), bd=todoDueTimestamp(b);
   if(ad!==bd) return ad-bd;
   return (priorityRank[a.priority]??99)-(priorityRank[b.priority]??99);
 }).slice(0,4);
 return <div className="content"><section className="hero"><div><div className="eyebrow"><Sparkles size={14}/> Selamat datang kembali</div><h1>Halo, {user?.name||"Guru"}! 👋</h1><p>Berikut ringkasan aktivitas matematika Anda hari ini.</p></div></section><div className="stats"><Stat icon={<BookOpen/>} label="Jam mengajar hari ini" value={activeSchedule.length} note={activeSchedule.length?formatTime(activeSchedule[0].startTime)+" — "+formatTime(activeSchedule[activeSchedule.length-1].endTime):"Tidak ada jadwal"}/><Stat icon={<ListTodo/>} label="Tugas aktif" value={todos.filter(t=>!t.done).length} note="Perlu diselesaikan"/><Stat icon={<CalendarDays/>} label="Agenda tersedia" value={events.length} note="Dari kalender sekolah"/></div><div className="grid"><section className="card schedule-card"><div className="card-head"><div><h2>Jadwal mengajar hari ini</h2><p>Data dari Google Sheets</p></div></div><div className="schedule-list">{activeSchedule.length?activeSchedule.map((s,i)=><div className="schedule-row" key={s.id||s.startTime}><div className="time"><b>{formatTime(s.startTime)}</b><span>{formatTime(s.endTime)}</span></div><div className="line"><i></i></div><div className="lesson"><div><b>{s.className}</b><span>{s.topic||"Tanpa topik"}</span></div><small>{s.room||"-"}</small></div></div>):<p style={{padding:20}}>Belum ada jadwal untuk hari ini.</p>}</div></section><section className="card todo-card"><div className="card-head"><div><h2>To-Do terdekat</h2><p>Urut berdasarkan deadline & prioritas</p></div></div><div className="todo-list">{todos.slice(0,4).map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)}/>)}</div></section></div><section className="card calendar-card"><div className="card-head"><div><h2>Agenda akademik</h2><p>Data dari Google Sheets</p></div></div><div className="events">{activeEvents.length?activeEvents.map(x=><Event key={x.id} day={normalizeCalendarDate(x.eventDate).slice(8,10)||"—"} title={x.title} meta={formatDate(x.eventDate)+" · "+formatTime(x.startTime)}/>):<p>Belum ada agenda.</p>}</div></section></div>
}

function Stat({icon,label,value,note}){return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>}
function formatDueDateTime(value){
  if(value==null||value==="") return "Belum ditentukan";
  const s=String(value).trim();
  const date=new Date(s);
  if(Number.isNaN(date.getTime())) return s;
  return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(date).replace(".",":");
}
function todoDueTimestamp(t){
  const value=t?.dueAt||t?.due||"";
  const parsed=Date.parse(String(value));
  return Number.isFinite(parsed)?parsed:Number.MAX_SAFE_INTEGER;
}
function TodoRow({t,toggle,onEdit,onDelete,actionLoading}){const busyEdit=actionLoading==="save";const busyDelete=actionLoading==="delete:"+String(t.id);return <div className={t.done?"todo-row done":"todo-row"}><button className="check" onClick={toggle} disabled={!!actionLoading}>{t.done&&<CheckCircle2 size={20}/>}</button><div className="todo-copy"><b>{t.title}</b><span>{t.description||t.desc||"Tanpa deskripsi"}</span><small><Clock3 size={13}/>{formatDueDateTime(t.dueAt||t.due)}</small></div><span className={"priority "+String(t.priority||"Sedang").toLowerCase()}>{t.priority||"Sedang"}</span>{!t.done&&onEdit&&onDelete&&<div className="todo-actions"><button className="secondary" type="button" onClick={()=>onEdit(t)} disabled={!!actionLoading}>{busyEdit?<><span className="button-spinner"></span>Menyimpan...</>:"Edit"}</button><button className="secondary" type="button" onClick={()=>onDelete(t)} disabled={!!actionLoading}>{busyDelete?<><span className="button-spinner"></span>Menghapus...</>:"Hapus"}</button></div>}</div>}
function Event({day,title,meta}){return <div className="event"><div className="date-box"><b>{day}</b><span>OKT</span></div><div><b>{title}</b><span>{meta}</span></div></div>}
function TodoPage({todos,toggleTodo,onAdd,onEdit,onDelete,actionLoading}){const active=todos.filter(t=>!t.done);const completed=todos.filter(t=>t.done);return <div className="content"><section className="page-title"><div><div className="eyebrow">Produktivitas pribadi</div><h1>To-Do</h1><p>Tugas ini hanya dapat dilihat dan dikelola oleh akun Anda.</p></div><button className="primary" onClick={onAdd}><CirclePlus size={18}/> Tambah tugas</button></section><section className="card"><div className="section-head"><div><b>Tugas aktif</b><p>{active.length} tugas belum selesai</p></div></div><div className="todo-list large">{active.length?active.map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)} onEdit={onEdit} onDelete={onDelete} actionLoading={actionLoading}/>):<p style={{padding:20}}>Belum ada tugas aktif.</p>}</div></section><section className="card" style={{marginTop:16}}><div className="section-head"><div><b>Riwayat tugas selesai</b><p>{completed.length} tugas telah diselesaikan</p></div></div><div className="todo-list large">{completed.length?completed.map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)}/>):<p style={{padding:20}}>Belum ada tugas yang diselesaikan.</p>}</div></section></div>}
function TeachersPage({user,onUserUpdated}){ 
  const [teachers,setTeachers]=useState([]);
  const [schedule,setSchedule]=useState([]);
  const [form,setForm]=useState({name:user?.name||"",subject:"Matematika",status:"Aktif"});
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  const load=()=>{
    setLoading(true);
    setError("");
    api.getBootstrap().then(d=>{
      setTeachers(d?.teachers||[]);
      setSchedule(d?.allSchedule||[]);
      const mine=(d?.teachers||[]).find(t=>String(t.email||"").toLowerCase()===String(user?.email||"").toLowerCase());
      if(mine) setForm({name:mine.name||user?.name||"",subject:mine.subject||"Matematika",status:mine.status||"Aktif"});
    }).catch(e=>setError(e.message||String(e))).finally(()=>setLoading(false));
  };
  useEffect(()=>{load()},[]);

  const save=async()=>{
    if(!form.name.trim()){setError("Nama guru wajib diisi.");return;}
    setSaving(true);setError("");setMessage("");
    try{
      await api.saveTeacher({email:user?.email,name:form.name.trim(),subject:form.subject,status:form.status});
      const freshUser=await api.getCurrentUser();
      onUserUpdated?.(freshUser);
      setMessage("Profil guru berhasil disimpan. Anda sekarang dapat menjadi kandidat guru pengganti.");
      load();
    }catch(e){setError(e.message||String(e));}
    finally{setSaving(false);}
  };

  const mine=teachers.find(t=>String(t.email||"").toLowerCase()===String(user?.email||"").toLowerCase());

  return <div className="content">
    <section className="page-title">
      <div><div className="eyebrow">Kolaborasi</div><h1>Guru Matematika</h1><p>Daftarkan profil guru agar dapat muncul sebagai kandidat Guru Pengganti.</p></div>
    </section>

    {error&&<div className="card" style={{marginBottom:16}}>{error}</div>}
    {message&&<div className="card" style={{marginBottom:16}}>{message}</div>}

    <section className="card profile-card">
      <div className="card-head"><div><h2>Profil saya</h2><p>Email diambil otomatis dari akun Google yang sedang digunakan.</p></div></div>
      <div className="form-grid">
        <label>Nama guru<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nama lengkap"/></label>
        <label>Email akun Google<input value={user?.email||""} disabled/></label>
        <label>Mata pelajaran<input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label>
        <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Aktif</option><option>Tidak aktif</option></select></label>
      </div>
      <button className="primary" onClick={save} disabled={saving||loading}>{loading?"Memuat data...":saving?"Menyimpan...":mine?"Simpan perubahan":"Daftarkan saya sebagai guru"}</button>
    </section>

    <section className="card">
      <div className="card-head"><div><h2>Daftar guru</h2><p>{teachers.length} guru terdaftar · digunakan untuk pencarian guru pengganti</p></div></div>
      {loading?<div className="loading-placeholder"><span className="loading-bar"></span><span className="loading-bar short"></span><span className="loading-bar"></span></div>:teachers.length?teachers.map(t=>{
        const count=schedule.filter(s=>String(s.teacherEmail||"").toLowerCase()===String(t.email||"").toLowerCase()).length;
        return <div className="todo-row" key={t.id||t.email}>
          <div className="avatar small">{initials(t.name||t.email)}</div>
          <div className="todo-copy"><b>{t.name||t.email}</b><span>{t.email}</span><small>{count} jadwal tersimpan</small></div>
          <span className="priority sedang">{t.status||"Aktif"}</span>
        </div>;
      }):<p>Belum ada guru yang terdaftar. Simpan profil Anda untuk memulai.</p>}
    </section>
  </div>;
}

function CalendarPage(){
  const today=new Date();
  const [events,setEvents]=useState([]);
  const [cal,setCal]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [showAdd,setShowAdd]=useState(false);
  const [month,setMonth]=useState(new Date(today.getFullYear(),today.getMonth(),1));
  const [selectedDate,setSelectedDate]=useState("");
  const [form,setForm]=useState({title:"",description:"",eventDate:"",startTime:"",endTime:"",type:"Agenda sekolah"});

  const defaultAcademicCalendar2026=[
    ["2026-01-01","Tahun Baru 2026 Masehi","holiday","Libur nasional"],
    ["2026-01-16","Isra Mikraj Nabi Muhammad SAW","holiday","Libur nasional"],
    ["2026-02-16","Tahun Baru Imlek 2577 Kongzili","important","Cuti bersama"],
    ["2026-02-17","Tahun Baru Imlek 2577 Kongzili","holiday","Libur nasional"],
    ["2026-03-18","Hari Suci Nyepi (Tahun Baru Saka 1948)","important","Cuti bersama"],
    ["2026-03-19","Hari Suci Nyepi (Tahun Baru Saka 1948)","holiday","Libur nasional"],
    ["2026-03-20","Cuti bersama Idulfitri 1447 H","important","Cuti bersama"],
    ["2026-03-21","Idulfitri 1447 H","holiday","Libur nasional"],
    ["2026-03-22","Idulfitri 1447 H","holiday","Libur nasional"],
    ["2026-03-23","Cuti bersama Idulfitri 1447 H","important","Cuti bersama"],
    ["2026-03-24","Cuti bersama Idulfitri 1447 H","important","Cuti bersama"],
    ["2026-04-03","Wafat Yesus Kristus","holiday","Libur nasional"],
    ["2026-04-05","Kebangkitan Yesus Kristus (Paskah)","holiday","Libur nasional"],
    ["2026-05-01","Hari Buruh Internasional","holiday","Libur nasional"],
    ["2026-05-02","Hari Pendidikan Nasional","important","Hari besar nasional"],
    ["2026-05-14","Kenaikan Yesus Kristus","holiday","Libur nasional"],
    ["2026-05-15","Cuti bersama Kenaikan Yesus Kristus","important","Cuti bersama"],
    ["2026-05-20","Hari Kebangkitan Nasional","important","Hari besar nasional"],
    ["2026-05-27","Iduladha 1447 H","holiday","Libur nasional"],
    ["2026-05-28","Cuti bersama Iduladha 1447 H","important","Cuti bersama"],
    ["2026-05-31","Hari Raya Waisak 2570 BE","holiday","Libur nasional"],
    ["2026-06-01","Hari Lahir Pancasila","holiday","Libur nasional"],
    ["2026-06-16","1 Muharam / Tahun Baru Islam 1448 H","holiday","Libur nasional"],
    ["2026-07-23","Hari Anak Nasional","important","Hari besar nasional"],
    ["2026-08-14","Hari Pramuka","important","Hari besar nasional"],
    ["2026-08-17","Hari Proklamasi Kemerdekaan Republik Indonesia","holiday","Libur nasional"],
    ["2026-08-25","Maulid Nabi Muhammad SAW","holiday","Libur nasional"],
    ["2026-09-24","Hari Tani Nasional","important","Hari besar nasional"],
    ["2026-10-01","Hari Kesaktian Pancasila","important","Hari besar nasional"],
    ["2026-10-02","Hari Batik Nasional","important","Hari besar nasional"],
    ["2026-10-28","Hari Sumpah Pemuda","important","Hari besar nasional"],
    ["2026-11-10","Hari Pahlawan","important","Hari besar nasional"],
    ["2026-11-25","Hari Guru Nasional","important","Hari besar nasional"],
    ["2026-12-22","Hari Ibu","important","Hari besar nasional"],
    ["2026-12-24","Cuti bersama Kelahiran Yesus Kristus","important","Cuti bersama"],
    ["2026-12-25","Kelahiran Yesus Kristus","holiday","Libur nasional"]
  ].map(([date,title,kind,description],i)=>({id:"default-2026-"+i,date,title,description,isNationalHoliday:kind==="holiday"}));

  const load=()=>{
    setLoading(true); setError("");
    return api.getBootstrap()
      .then(d=>{setEvents((d?.events||[]).map(x=>({...x,eventDate:normalizeCalendarDate(x.eventDate)})));setCal(d?.academicCalendar||[])})
      .catch(e=>setError(e.message||String(e)))
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{load()},[]);

  const save=async()=>{
    if(!form.title.trim()){setError("Nama agenda wajib diisi.");return}
    if(!form.eventDate){setError("Tanggal agenda wajib diisi.");return}
    if(form.startTime&&form.endTime&&form.startTime>=form.endTime){setError("Jam selesai harus lebih besar dari jam mulai.");return}
    setSaving(true);setError("");setMessage("");
    try{
      await api.saveEvent({title:form.title.trim(),description:form.description.trim(),eventDate:form.eventDate,startTime:form.startTime||"",endTime:form.endTime||"",type:form.type});
      setMessage("Agenda sekolah berhasil ditambahkan dan dapat dilihat oleh semua guru.");
      setForm({title:"",description:"",eventDate:"",startTime:"",endTime:"",type:"Agenda sekolah"});
      setShowAdd(false); await load();
    }catch(e){setError(e.message||String(e))}
    finally{setSaving(false)}
  };

  const keyForDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const monthName=new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(month);
  const firstDay=(month.getDay()+6)%7;
  const daysInMonth=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(new Date(month.getFullYear(),month.getMonth(),d));
  while(cells.length%7) cells.push(null);

  const byDate={};
  [...defaultAcademicCalendar2026,...cal].forEach(x=>{const k=String(x.date||"").slice(0,10);if(k)(byDate[k]??=[]).push({...x,kind:x.isNationalHoliday?"holiday":"important"})});
  events.forEach(x=>{const k=String(x.eventDate||"").slice(0,10);if(k)(byDate[k]??=[]).push({...x,kind:"school"})});

  const selectedItems=(byDate[selectedDate]||[]);
  const openAddFor=(date)=>{
    setError("");setMessage("");
    setForm(f=>({...f,eventDate:date||f.eventDate}));
    setShowAdd(true);
  };

  return <div className="content">
    <section className="page-title">
      <div><div className="eyebrow">Akademik</div><h1>Kalender Akademik</h1><p>Libur nasional, hari besar, dan agenda sekolah dalam satu kalender bersama.</p></div>
      <button className="primary" type="button" onClick={()=>openAddFor("")}><CirclePlus size={18}/> Tambah agenda</button>
    </section>
    {error&&<div className="card" style={{marginBottom:16}}><b>Gagal memproses kalender</b><p>{error}</p></div>}
    {message&&<div className="card" style={{marginBottom:16}}>{message}</div>}

    {loading?<InlineLoading text="Memuat kalender akademik..."/>:<>
      <section className="card calendar-card">
        <div className="calendar-full">
          <div className="month-head">
            <button className="secondary" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button>
            <h2>{monthName}</h2>
            <button className="secondary" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button>
          </div>
          <div className="calendar-legend">
            <span><i className="legend-dot holiday-dot"></i> Libur nasional</span>
            <span><i className="legend-dot important-dot"></i> Hari besar</span>
            <span><i className="legend-dot school-dot"></i> Agenda sekolah</span>
          </div>
          <div className="weekdays">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=><b key={x}>{x}</b>)}</div>
          <div className="days">
            {cells.map((date,i)=>{
              if(!date)return <div className="day muted" key={"empty"+i}></div>;
              const k=keyForDate(date), items=byDate[k]||[], isToday=k===keyForDate(today), isSelected=k===selectedDate;
              return <button type="button" className={"day calendar-day "+(isToday?"today ":"")+(isSelected?"selected ":"")} key={k} onClick={()=>setSelectedDate(isSelected?"":k)}>
                <b>{date.getDate()}</b>
                <div className="day-items">
                  {items.slice(0,3).map((x,j)=><span key={x.id||j} className={"calendar-event "+x.kind} title={x.title}>{x.title}</span>)}
                  {items.length>3&&<span className="more-events">+{items.length-3} lainnya</span>}
                </div>
              </button>
            })}
          </div>
        </div>
      </section>

      <section className="calendar-details">
        <section className="card">
          <div className="card-head"><div><h2>{selectedDate?formatDate(selectedDate):"Agenda & hari penting"}</h2><p>{selectedDate?"Kegiatan pada tanggal yang dipilih":"Klik tanggal pada kalender untuk melihat detail."}</p></div></div>
          <div className="calendar-list">
            {selectedDate ? (selectedItems.length?selectedItems.map(x=><div className="calendar-detail-item" key={x.id}><span className={"calendar-badge "+x.kind}>{x.kind==="holiday"?"Libur nasional":x.kind==="important"?"Hari besar":"Agenda sekolah"}</span><div><b>{x.title}</b><small>{x.description||((x.startTime?formatTime(x.startTime):"")+(x.endTime?"–"+formatTime(x.endTime):""))||"Tanpa keterangan tambahan"}</small></div></div>):<p>Tidak ada agenda atau hari penting pada tanggal ini.</p>) : <p>Pilih tanggal untuk melihat detail agenda.</p>}
          </div>
        </section>
        <section className="card">
          <div className="card-head"><div><h2>Tambah agenda sekolah</h2><p>Agenda yang dibuat akan terlihat oleh semua guru.</p></div></div>
          <div className="calendar-add-box"><button className="primary" onClick={()=>openAddFor(selectedDate)}>Tambah agenda sekolah</button></div>
        </section>
      </section>
    </>}

    {showAdd&&<div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head"><div><h2>Tambah agenda sekolah</h2><p>Agenda tersimpan di kalender bersama untuk semua guru.</p></div><button className="icon-btn" onClick={()=>{if(!saving)setShowAdd(false)}} disabled={saving}><X/></button></div>
        <label>Nama agenda<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Contoh: Sumatif Tengah Semester"/></label>
        <label>Deskripsi<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Keterangan agenda (opsional)"/></label>
        <label>Tanggal<input type="date" value={form.eventDate} onChange={e=>setForm({...form,eventDate:e.target.value})}/></label>
        <div className="two"><label>Mulai<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Selesai<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label></div>
        <label>Jenis agenda<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Agenda sekolah</option><option>Ujian / Asesmen</option><option>Rapat</option><option>Kegiatan sekolah</option><option>Lainnya</option></select></label>
        <div className="modal-actions"><button className="secondary" type="button" onClick={()=>setShowAdd(false)} disabled={saving}>Batal</button><button className="primary" type="button" disabled={saving||!form.title.trim()||!form.eventDate} onClick={save}>{saving?<><span className="button-spinner"></span>Menyimpan agenda...</>:"Simpan agenda"}</button></div>
      </div>
    </div>}
  </div>
}

function DrivePage(){const [data,setData]=useState({configured:false,files:[]});const [loading,setLoading]=useState(true);const [error,setError]=useState("");useEffect(()=>{api.getDriveMaterials().then(setData).catch(e=>setError(e.message||String(e))).finally(()=>setLoading(false))},[]);return <div className="content"><section className="page-title"><div><div className="eyebrow">Google Drive</div><h1>Drive Materi</h1><p>Materi mengajar yang tersimpan di folder Google Drive sekolah.</p></div>{data.folderUrl&&<a className="primary" href={data.folderUrl} target="_blank" rel="noreferrer">Buka folder Drive</a>}</section>{error&&<div className="card" style={{marginBottom:16}}>{error}</div>}{loading?<InlineLoading text="Memuat data Drive materi..."/>:<section className="card">{!data.configured?<p>Folder Drive belum dikonfigurasi.</p>:data.files.length?data.files.map(x=><div className="event" key={x.id}><div className="date-box"><FileText size={22}/></div><div><b>{x.name}</b><span>{x.mimeType} · {Math.round((x.size||0)/1024)} KB</span></div><a className="text-btn" href={x.url} target="_blank" rel="noreferrer">Buka</a></div>):<p>Folder Drive masih kosong.</p>}</section>}</div>}
function minutesToTime(value){
  const total = Number(value);
  if(!Number.isFinite(total)) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}

function timeToMinutesClient(value){
  const m=String(value||"").match(/^(\d{1,2}):(\d{2})$/);
  if(!m) return NaN;
  return Number(m[1])*60+Number(m[2]);
}

function buildCoveragePlan(candidates,startTime,endTime){
  const start=timeToMinutesClient(startTime);
  const end=timeToMinutesClient(endTime);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end) return null;

  const segments=[];
  (candidates||[]).forEach(candidate=>{
    (candidate.availableSegments||[]).forEach(segment=>{
      const s=timeToMinutesClient(segment.startTime);
      const e=timeToMinutesClient(segment.endTime);
      if(Number.isFinite(s)&&Number.isFinite(e)&&e>s){
        segments.push({
          email:candidate.email,
          name:candidate.name||candidate.email,
          subject:candidate.subject||"Matematika",
          start:Math.max(start,s),
          end:Math.min(end,e),
          dailyLoad:candidate.dailyLoad||0
        });
      }
    });
  });

  let cursor=start;
  const plan=[];
  const used=new Set();

  while(cursor<end){
    const options=segments
      .filter(x=>x.start<=cursor && x.end>cursor && !used.has(x.email))
      .sort((a,b)=>b.end-a.end || a.dailyLoad-b.dailyLoad || a.name.localeCompare(b.name));

    if(!options.length) return null;

    const chosen=options[0];
    const segmentEnd=Math.min(chosen.end,end);

    plan.push({
      email:chosen.email,
      name:chosen.name,
      subject:chosen.subject,
      startTime:minutesToTime(cursor),
      endTime:minutesToTime(segmentEnd)
    });

    used.add(chosen.email);
    cursor=segmentEnd;
  }

  return plan;
}

function localDateKey(date=new Date()){
 const y=date.getFullYear();
 const m=String(date.getMonth()+1).padStart(2,"0");
 const d=String(date.getDate()).padStart(2,"0");
 return `${y}-${m}-${d}`;
}

function SubstitutePage({user}){
 const today=localDateKey();
 const [form,setForm]=useState({date:today,startTime:"07:00",endTime:"08:20",className:"",topic:"",room:"",reason:""});
 const [candidates,setCandidates]=useState([]);
 const [plan,setPlan]=useState(null);
 const [requests,setRequests]=useState([]);
 const [history,setHistory]=useState([]);
 const [loading,setLoading]=useState(false);
 const [initialLoading,setInitialLoading]=useState(true);
 const [message,setMessage]=useState("");

 const refresh=async()=>{
   const [incoming,all]=await Promise.all([api.getSubstitutionRequests(),api.getBootstrap()]);
   setRequests(incoming?.requests||incoming||[]);
   setHistory((all?.substitutions||[]).filter(x=>String(x.absentTeacherEmail||"").toLowerCase()===String(user?.email||"").toLowerCase()));
 };

 const search=()=>{
   setLoading(true);
   setMessage("");
   setPlan(null);
   api.findSubstituteCandidates(form)
     .then(r=>{
       const list=r?.candidates||r||[];
       setCandidates(Array.isArray(list)?list:[]);
       const coverage=buildCoveragePlan(Array.isArray(list)?list:[],form.startTime,form.endTime);
       setPlan(coverage);
       if(!coverage){
         setMessage("Belum ditemukan kombinasi guru yang dapat menutup seluruh jam pengganti.");
       }
     })
     .catch(e=>setMessage(e.message||String(e)))
     .finally(()=>setLoading(false));
 };

 const send=async()=>{
   if(!plan||!plan.length)return;
   setLoading(true);
   setMessage("");
   try{
     for(const segment of plan){
       await api.saveSubstitution({
         ...form,
         startTime:segment.startTime,
         endTime:segment.endTime,
         substituteTeacherEmail:segment.email
       });
     }
     setMessage(
       plan.length===1
         ? "Permintaan guru pengganti berhasil dikirim."
         : "Rencana pengganti terbagi menjadi "+plan.length+" permintaan dan berhasil dikirim."
     );
     setPlan(null);
     setCandidates([]);
     await refresh();
   }catch(e){
     setMessage(e.message||String(e));
   }finally{
     setLoading(false);
   }
 };

 const respond=async(id,response)=>{
   setLoading(true);
   setMessage("");
   try{
     await api.respondSubstitution(id,response);
     setMessage(response==="terima"?"Permintaan diterima. Jadwal pengganti akan masuk ke jadwal efektif.":"Permintaan ditolak.");
     await refresh();
   }catch(e){
     setMessage(e.message||String(e));
   }finally{
     setLoading(false);
   }
 };

 useEffect(()=>{refresh().catch(e=>setMessage(e.message||String(e))).finally(()=>setInitialLoading(false))},[]);

 return <div className="content">
   {initialLoading ? <InlineLoading text="Memuat guru pengganti..." /> : <>
   <section className="page-title">
     <div><div className="eyebrow">Kolaborasi</div><h1>Guru Pengganti</h1><p>Math Up dapat membagi satu jam mengajar ke beberapa guru jika tidak ada satu guru yang tersedia penuh.</p></div>
   </section>

   <section className="card substitution-form-card">
     <div className="card-head"><div><h2>Ajukan guru pengganti</h2><p>Isi detail kelas. Sistem akan mencari satu guru atau kombinasi beberapa guru yang dapat menutup seluruh waktu.</p></div></div>
     <div className="form-grid">
       <label>Tanggal<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
       <label>Kelas<input value={form.className} onChange={e=>setForm({...form,className:e.target.value})} placeholder="VIII-A"/></label>
       <label>Mulai<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label>
       <label>Selesai<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label>
       <label>Materi<input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="Materi pelajaran"/></label>
       <label>Ruangan<input value={form.room} onChange={e=>setForm({...form,room:e.target.value})} placeholder="R. 201"/></label>
       <label className="form-full">Alasan<input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Berhalangan hadir"/></label>
     </div>
     <button className="primary" onClick={search} disabled={loading}>{loading?"Mencari guru...":"Cari guru pengganti"}</button>
     {message&&<div className="notice">{message}</div>}
   </section>

   {plan&&<section className="card">
     <div className="card-head">
       <div>
         <h2>Rencana pengganti</h2>
         <p>{plan.length===1?"Satu guru dapat menutup seluruh waktu.":"Jadwal dibagi agar seluruh waktu "+formatTime(form.startTime)+"–"+formatTime(form.endTime)+" tertutup."}</p>
       </div>
     </div>
     {plan.map((x,i)=><div className="todo-row" key={x.email+"-"+i}>
       <div className="todo-copy">
         <b>{x.name||x.email}</b>
         <span>{formatTime(x.startTime)}–{formatTime(x.endTime)} · {x.subject||"Matematika"}</span>
         <small>{i===0?"Bagian "+(i+1):"Lanjutan bagian "+(i+1)}</small>
       </div>
       <span className="priority sedang">Dipilih</span>
     </div>)}
     <button className="primary" disabled={loading} onClick={send}>
       {loading?"Mengirim...":plan.length===1?"Kirim permintaan":"Kirim semua permintaan"}
     </button>
   </section>}

   {!plan&&candidates.length>0&&<section className="card">
     <div className="card-head">
       <div>
         <h2>Ketersediaan guru</h2>
         <p>Daftar ini menunjukkan bagian waktu yang masih dapat diisi masing-masing guru.</p>
       </div>
     </div>
     {candidates.map(x=><div className="todo-row" key={x.email}>
       <div className="todo-copy">
         <b>{x.name||x.email}</b>
         <span>{x.email}</span>
         <small>
           {x.availableSegments?.length
             ? x.availableSegments.map(s=>formatTime(s.startTime)+"–"+formatTime(s.endTime)).join(" · ")
             : "Tidak ada waktu tersedia"}
           {x.dailyLoad!=null?" · Beban "+x.dailyLoad+" jadwal":""}
         </small>
       </div>
       <span className={"priority "+(x.availableSegments?.length?"sedang":"tinggi")}>
         {x.status||"Tidak tersedia"}
       </span>
     </div>)}
   </section>}

   <section className="card">
     <div className="card-head"><div><h2>Permintaan masuk</h2><p>Permintaan yang ditujukan kepada Anda.</p></div></div>
     {requests.length?requests.map(x=><div className="todo-row" key={x.id}>
       <div className="todo-copy"><b>{x.className} · {formatDate(x.date)}</b><span>{formatTime(x.startTime)}–{formatTime(x.endTime)} · {x.topic||"Tanpa materi"}</span><small>{x.reason||"Tanpa alasan"}{x.room?" · "+x.room:""}</small></div>
       <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:"auto"}}>
         <span className="priority sedang">{x.status}</span>
         {String(x.status||"") === "Diajukan" && <><button className="secondary" disabled={loading} onClick={()=>respond(x.id,"terima")}>Terima</button><button className="secondary" disabled={loading} onClick={()=>respond(x.id,"tolak")}>Tolak</button></>}
       </div>
     </div>):<p>Belum ada permintaan masuk.</p>}
   </section>

   <section className="card">
     <div className="card-head"><div><h2>Riwayat permintaan saya</h2><p>Pengajuan pengganti yang Anda buat.</p></div></div>
     {history.length?history.slice().sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).map(x=><div className="todo-row" key={x.id}>
       <div className="todo-copy"><b>{x.className} · {formatDate(x.date)}</b><span>{formatTime(x.startTime)}–{formatTime(x.endTime)} · {x.substituteTeacherEmail||"Belum dipilih"}</span><small>{x.topic||"Tanpa materi"}{x.reason?" · "+x.reason:""}</small></div>
       <span className="priority sedang">{x.status}</span>
     </div>):<p>Belum ada pengajuan.</p>}
   </section>
   </>}
 </div>
}
function SchedulePage({user}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loaded,setLoaded]=useState(false);
  const [show,setShow]=useState(false);
  const [view,setView]=useState("mine");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [form,setForm]=useState({day:"Senin",startTime:"07:00",endTime:"08:20",className:"",topic:"",room:""}); const [editing,setEditing]=useState(null);
  const load=()=>{setLoading(true);setError("");return api.getBootstrap().then(d=>{setItems(d?.allSchedule||[]);setLoaded(true);}).catch(e=>{setError(e.message||String(e));}).finally(()=>setLoading(false));};
  useEffect(()=>{load()},[]);
  const mine=items.filter(x=>String(x.teacherEmail||"").toLowerCase()===String(user?.email||"").toLowerCase());
  const visible=(view==="mine"?mine:items).slice().sort((a,b)=>{const days={Senin:1,Selasa:2,Rabu:3,Kamis:4,Jumat:5,Sabtu:6,Minggu:7};return (days[a.day]||99)-(days[b.day]||99)||String(formatTime(a.startTime)||"").localeCompare(String(formatTime(b.startTime)||""));});
  const save=async()=>{
    if(!form.className.trim()){setError("Nama kelas wajib diisi.");return;}
    if(!form.startTime||!form.endTime){setError("Jam mulai dan selesai wajib diisi.");return;}
    if(form.startTime>=form.endTime){setError("Jam selesai harus lebih besar dari jam mulai.");return;}
    setSaving(true);setError("");
    try{
      const payload={...form,className:form.className.trim(),topic:form.topic.trim(),room:form.room.trim()}; if(editing) await api.updateSchedule({...payload,id:editing.id}); else await api.saveSchedule(payload);
      const data=await api.getBootstrap();
      setItems(data?.allSchedule||[]);
      setShow(false); setEditing(null); setForm({day:"Senin",startTime:"07:00",endTime:"08:20",className:"",topic:"",room:""});
    }catch(e){setError(e.message||String(e));}
    finally{setSaving(false);}
  };
  const startEdit=s=>{if(String(s.teacherEmail||"").toLowerCase()!==String(user?.email||"").toLowerCase())return;setEditing(s);setForm({day:s.day||"Senin",startTime:formatTime(s.startTime),endTime:formatTime(s.endTime),className:s.className||"",topic:s.topic||"",room:s.room||""});setShow(true);setError("");};
  const remove=async s=>{if(String(s.teacherEmail||"").toLowerCase()!==String(user?.email||"").toLowerCase())return;if(!window.confirm("Hapus jadwal ini?"))return;setSaving(true);setError("");try{await api.deleteSchedule(s.id);const data=await api.getBootstrap();setItems(data?.allSchedule||[]);}catch(e){setError(e.message||String(e));}finally{setSaving(false);}};
  return <div className="content"><section className="page-title"><div><div className="eyebrow">Jadwal</div><h1>Jadwal Mengajar</h1><p>Jadwal tersimpan bersama di Google Sheets dan dapat dilihat oleh guru matematika.</p></div><button className="primary add-schedule-btn" type="button" title="Tambah jadwal mengajar" onClick={()=>{setEditing(null);setForm({day:"Senin",startTime:"07:00",endTime:"08:20",className:"",topic:"",room:""});setShow(true);setError("");}}><CirclePlus size={18}/> Tambah jadwal</button></section>{loading?<InlineLoading text="Memuat data jadwal mengajar..."/>:error&&!loaded?<div className="card"><div className="card-head"><div><h2>Jadwal belum dapat dimuat</h2><p>Koneksi ke server Math Up sedang bermasalah.</p></div><button className="secondary" onClick={load}>Coba lagi</button></div><p>{error}</p></div>:<><section className="card"><div className="card-head"><div><h2>{view==="mine"?"Jadwal saya":"Jadwal semua guru"}</h2><p>{visible.length} jadwal tersimpan</p></div><div style={{display:"flex",gap:8}}><button className={view==="mine"?"primary":"secondary"} onClick={()=>setView("mine")}>Jadwal saya</button><button className={view==="all"?"primary":"secondary"} onClick={()=>setView("all")}>Semua guru</button></div></div><div className="schedule-list">{visible.length?visible.map(s=><div className="schedule-row" key={s.id}><div className="time"><b>{s.startTime}</b><span>{s.endTime}</span></div><div className="line"><i></i></div><div className="lesson"><div><b>{s.day} · {s.className}</b><span>{s.topic||"Tanpa topik"}{view==="all"&&s.teacherEmail?" · "+s.teacherEmail:""}</span></div><small>{s.room||"-"}</small></div>{view==="mine"&&String(s.teacherEmail||"").toLowerCase()===String(user?.email||"").toLowerCase()&&<div style={{display:"flex",gap:6,marginLeft:"auto"}}><button className="secondary" type="button" onClick={()=>startEdit(s)} disabled={saving}>{saving?<><span className="button-spinner"></span>Menyimpan...</>:"Edit"}</button><button className="secondary" type="button" onClick={()=>remove(s)} disabled={saving}>{saving?<><span className="button-spinner"></span>Memproses...</>:"Hapus"}</button></div>}</div>):<p style={{padding:20}}>Belum ada jadwal. Klik “Tambah jadwal”.</p>}</div></section></>}{show&&<div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><h2>{editing?"Edit jadwal":"Tambah jadwal"}</h2><p>Jadwal akan tersimpan ke Google Sheets.</p></div><button className="icon-btn" onClick={()=>{if(!saving){setShow(false);setEditing(null);}}} disabled={saving}><X/></button></div><label>Hari<select value={form.day} onChange={e=>setForm({...form,day:e.target.value})}>{["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"].map(x=><option key={x}>{x}</option>)}</select></label><div className="two"><label>Mulai<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Selesai<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label></div><label>Kelas<input value={form.className} onChange={e=>setForm({...form,className:e.target.value})} placeholder="VIII-A"/></label><label>Materi / Topik<input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="Persamaan Linear"/></label><label>Ruangan<input value={form.room} onChange={e=>setForm({...form,room:e.target.value})} placeholder="R. 201"/></label><div className="modal-actions"><button className="secondary" type="button" onClick={()=>{if(!saving){setShow(false);setEditing(null);}}} disabled={saving}>Batal</button><button className="primary" type="button" disabled={saving||!form.className.trim()} onClick={save}>{saving?<><span className="button-spinner"></span>{editing?"Menyimpan perubahan...":"Menyimpan jadwal..."}</>:editing?"Simpan perubahan":"Simpan jadwal"}</button></div></div></div>}</div>
}
function Placeholder({title}){return <div className="content"><section className="empty card"><div className="empty-icon"><CalendarDays size={28}/></div><h1>{title}</h1><p>Modul ini sudah disiapkan di Math Up dan akan kita sambungkan ke data Google Sheets/Drive pada tahap berikutnya.</p><button className="primary">Siapkan modul</button></section></div>}
function TodoModal({onClose,onSave,initial,saving}){const [title,setTitle]=useState(initial?.title||"");const [desc,setDesc]=useState(initial?.description||initial?.desc||"");const initialDue=String(initial?.dueAt||initial?.due||"");const [dueDate,setDueDate]=useState(initialDue.match(/^(\\d{4}-\\d{2}-\\d{2})/)?.[1]||"");const [dueTime,setDueTime]=useState(initialDue.match(/T(\\d{2}:\\d{2})/)?.[1]||"");const [priority,setPriority]=useState(initial?.priority||"Sedang");const save=()=>{const due=dueDate&&dueTime?dueDate+"T"+dueTime:"";onSave({title,desc,due,priority});};return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><h2>{initial?"Edit tugas":"Tugas baru"}</h2><p>Tambahkan pekerjaan yang perlu diselesaikan.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><label>Nama tugas<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Siapkan soal..." /></label><label>Deskripsi<textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Detail tugas..." /></label><div className="two"><label>Tanggal deadline<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label>Jam berakhir<input type="time" value={dueTime} onChange={e=>setDueTime(e.target.value)}/></label></div><label>Prioritas<select value={priority} onChange={e=>setPriority(e.target.value)}><option>Rendah</option><option>Sedang</option><option>Tinggi</option></select></label><div className="modal-actions"><button className="secondary" onClick={onClose}>Batal</button><button className="primary" disabled={!title.trim()||!dueDate||!dueTime||saving} onClick={save}>{saving?<><span className="button-spinner"></span>Menyimpan...</>:initial?"Simpan perubahan":"Simpan tugas"}</button></div></div></div>}

export default App;