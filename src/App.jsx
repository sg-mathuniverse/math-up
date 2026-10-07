import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import {
  Bell, CalendarDays, CheckCircle2, ChevronDown, CirclePlus, Clock3,
  FileText, LayoutDashboard, ListTodo, Menu, MoreHorizontal, Search,
  Settings, Users, X, BookOpen, Sparkles
} from "lucide-react";

const initialTodos = [
  { id:1, title:"Siapkan soal STS kelas VIII", desc:"Kumpulkan kisi-kisi dan finalisasi 25 soal.", due:"Hari ini, 16:00", priority:"Tinggi", done:false },
  { id:2, title:"Upload materi persamaan linear", desc:"Materi pertemuan minggu depan.", due:"Besok, 10:00", priority:"Sedang", done:false },
  { id:3, title:"Rapat tim matematika", desc:"Review pembagian jadwal semester.", due:"10 Okt 2026, 13:00", priority:"Sedang", done:true }
];

const schedule = [
  {time:"07:00", end:"08:20", className:"VIII-A", topic:"Persamaan Linear Dua Variabel", room:"R. 201"},
  {time:"09:00", end:"10:20", className:"IX-B", topic:"Peluang", room:"R. 104"},
  {time:"11:00", end:"12:20", className:"VII-C", topic:"Aritmetika Sosial", room:"R. 203"}
];

function App(){
  const [active,setActive]=useState("Dashboard");
  const [authChecked,setAuthChecked]=useState(false);
  const [authUser,setAuthUser]=useState(null);
  const [todos,setTodos]=useState(initialTodos);
  const [menuOpen,setMenuOpen]=useState(false);
  const [showTodo,setShowTodo]=useState(false);
  const [query,setQuery]=useState("");
  const [user,setUser]=useState(null);
  const [dashboard,setDashboard]=useState({schedule:[],events:[]});
  const [loading,setLoading]=useState(true);
  const [apiError,setApiError]=useState("");

  useEffect(()=>{
    api.getCurrentUser().then(u=>{
      setAuthUser(u||null);
      if(u?.email){
        return api.getBootstrap().then(d=>{
          setTodos(d?.todos||[]);
          setUser(d?.user||u);
          setDashboard({schedule:d?.schedule||[],events:d?.events||[]});
        });
      }
    }).catch(e=>setApiError(e.message||String(e))).finally(()=>{
      setAuthChecked(true);
      setLoading(false);
    });
  },[]);

  const filteredTodos=useMemo(()=>todos.filter(t=>t.title.toLowerCase().includes(query.toLowerCase())),[todos,query]);

  if(!authChecked || loading) return <LoadingScreen/>;

  if(!authUser?.email) return <LoginScreen error={apiError}/>;

  const toggleTodo=id=>{const t=todos.find(x=>x.id===id);if(!t)return;api.toggleTodo(id,!t.done).then(()=>setTodos(ts=>ts.map(x=>x.id===id?{...x,done:!x.done}:x))).catch(e=>setApiError(e.message||String(e)));};

  return <div className="app">
    <aside className={menuOpen?"sidebar open":"sidebar"}>
      <div className="brand"><div className="brand-mark">∑</div><div><strong>Math Up</strong><span>Teacher Workspace</span></div></div>
      <nav>
        <Nav icon={<LayoutDashboard size={19}/>} label="Dashboard" active={active==="Dashboard"} onClick={()=>setActive("Dashboard")}/>
        <Nav icon={<CalendarDays size={19}/>} label="Jadwal Mengajar" active={active==="Jadwal Mengajar"} onClick={()=>setActive("Jadwal Mengajar")}/>
        <Nav icon={<Users size={19}/>} label="Guru Pengganti" active={active==="Guru Pengganti"} onClick={()=>setActive("Guru Pengganti")}/>
        <Nav icon={<ListTodo size={19}/>} label="To-Do" active={active==="To-Do"} onClick={()=>setActive("To-Do")}/>
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
          <div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari tugas..." /></div>
          <button className="icon-btn"><Bell size={19}/><i></i></button>
          <button className="user-chip" onClick={()=>setMenuOpen(v=>v)}><div className="avatar small">{user?.photoUrl?<img src={user.photoUrl} alt={user.name||"Profil"} />:initials(user?.name||user?.email||"?")}</div><ChevronDown size={15}/></button>
        </div>
      </header>

      {active==="Dashboard" ? <Dashboard todos={filteredTodos} toggleTodo={toggleTodo} onAdd={()=>setShowTodo(true)} schedule={dashboard.schedule} events={dashboard.events} user={user} /> :
       active==="Jadwal Mengajar" ? <SchedulePage user={user} /> : active==="Guru Pengganti" ? <SubstitutePage user={user} /> :
       active==="Kalender Akademik" ? <CalendarPage /> :
       active==="Drive Materi" ? <DrivePage /> :
       active==="Guru Matematika" ? <TeachersPage /> :
       active==="Pengaturan" ? <SettingsPage /> :
       active==="To-Do" ? <TodoPage todos={filteredTodos} toggleTodo={toggleTodo} onAdd={()=>setShowTodo(true)} /> :
       <Placeholder title={active} />}

      {apiError && <div className="card" style={{margin:"16px"}}>{apiError}</div>}{showTodo && <TodoModal onClose={()=>setShowTodo(false)} onSave={t=>{api.saveTodo({title:t.title,description:t.desc,dueAt:t.due,priority:t.priority,done:false}).then(saved=>{setTodos(ts=>[...ts,saved]);setShowTodo(false)}).catch(e=>setApiError(e.message||String(e)))}}/>}
    </main>
  </div>
}


function LoadingScreen(){
  return <div className="auth-screen"><div className="auth-card"><div className="brand-mark">∑</div><h1>Math Up</h1><p>Memeriksa akun Google Anda…</p></div></div>;
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

function Nav({icon,label,active,onClick}){return <button className={active?"nav active":"nav"} onClick={onClick}>{icon}<span>{label}</span>{label==="To-Do"&&<em>3</em>}</button>}

function Dashboard({todos,toggleTodo,onAdd,schedule,events,user}){
 const activeSchedule=(schedule||[]).slice().sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)));
 const activeEvents=(events||[]).slice().sort((a,b)=>String(a.eventDate).localeCompare(String(b.eventDate))).slice(0,3);
 return <div className="content"><section className="hero"><div><div className="eyebrow"><Sparkles size={14}/> Selamat datang kembali</div><h1>Halo, {user?.name||"Guru"}! 👋</h1><p>Berikut ringkasan aktivitas matematika Anda hari ini.</p></div><button className="primary" onClick={onAdd}><CirclePlus size={18}/> Tambah tugas</button></section><div className="stats"><Stat icon={<BookOpen/>} label="Jam mengajar hari ini" value={activeSchedule.length} note={activeSchedule.length?formatTime(activeSchedule[0].startTime)+" — "+formatTime(activeSchedule[activeSchedule.length-1].endTime):"Tidak ada jadwal"}/><Stat icon={<ListTodo/>} label="Tugas aktif" value={todos.filter(t=>!t.done).length} note="Perlu diselesaikan"/><Stat icon={<CalendarDays/>} label="Agenda tersedia" value={events.length} note="Dari kalender sekolah"/></div><div className="grid"><section className="card schedule-card"><div className="card-head"><div><h2>Jadwal mengajar hari ini</h2><p>Data dari Google Sheets</p></div></div><div className="schedule-list">{activeSchedule.length?activeSchedule.map((s,i)=><div className="schedule-row" key={s.id||s.startTime}><div className="time"><b>{formatTime(s.startTime)}</b><span>{formatTime(s.endTime)}</span></div><div className="line"><i></i></div><div className="lesson"><div><b>{s.className}</b><span>{s.topic||"Tanpa topik"}</span></div><small>{s.room||"-"}</small></div></div>):<p style={{padding:20}}>Belum ada jadwal untuk hari ini.</p>}</div></section><section className="card todo-card"><div className="card-head"><div><h2>To-Do terdekat</h2><p>Urut berdasarkan deadline & prioritas</p></div></div><div className="todo-list">{todos.slice(0,4).map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)}/>)}</div><button className="full-btn" onClick={onAdd}>+ Tambah tugas baru</button></section></div><section className="card calendar-card"><div className="card-head"><div><h2>Agenda akademik</h2><p>Data dari Google Sheets</p></div></div><div className="events">{activeEvents.length?activeEvents.map(x=><Event key={x.id} day={String(x.eventDate||"").slice(8,10)||"—"} title={x.title} meta={(x.eventDate||"")+" · "+formatTime(x.startTime)}/>):<p>Belum ada agenda.</p>}</div></section></div>
}

function Stat({icon,label,value,note}){return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>}
function TodoRow({t,toggle}){return <div className={t.done?"todo-row done":"todo-row"}><button className="check" onClick={toggle}>{t.done&&<CheckCircle2 size={20}/>}</button><div className="todo-copy"><b>{t.title}</b><span>{t.desc}</span><small><Clock3 size={13}/>{t.due}</small></div><span className={"priority "+t.priority.toLowerCase()}>{t.priority}</span></div>}
function Event({day,title,meta}){return <div className="event"><div className="date-box"><b>{day}</b><span>OKT</span></div><div><b>{title}</b><span>{meta}</span></div></div>}
function TodoPage({todos,toggleTodo,onAdd}){return <div className="content"><section className="page-title"><div><div className="eyebrow">Produktivitas</div><h1>To-Do</h1><p>Kelola pekerjaan mengajar tanpa kehilangan deadline.</p></div><button className="primary" onClick={onAdd}><CirclePlus size={18}/> Tambah tugas</button></section><section className="card"><div className="todo-list large">{todos.map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)}/>)}</div></section></div>}
function TeachersPage(){const [teachers,setTeachers]=useState([]);const [schedule,setSchedule]=useState([]);useEffect(()=>{api.getBootstrap().then(d=>{setTeachers(d?.teachers||[]);setSchedule(d?.allSchedule||[])}).catch(()=>{})},[]);return <div className="content"><section className="page-title"><div><div className="eyebrow">Kolaborasi</div><h1>Guru Matematika</h1><p>Daftar guru dan ringkasan jadwal mengajar bersama.</p></div></section><section className="card"><div className="card-head"><div><h2>Daftar guru</h2><p>{teachers.length} guru terdaftar</p></div></div>{teachers.length?teachers.map(t=><div className="todo-row" key={t.id||t.email}><div className="avatar small">{String(t.name||"G").slice(0,1).toUpperCase()}</div><div className="todo-copy"><b>{t.name||t.email}</b><span>{t.email}</span><small>{schedule.filter(s=>String(s.teacherEmail).toLowerCase()===String(t.email).toLowerCase()).length} jadwal</small></div><span className="priority sedang">{t.status||"Aktif"}</span></div>):<p>Belum ada data guru.</p>}</section></div>}

function CalendarPage(){const [events,setEvents]=useState([]);const [cal,setCal]=useState([]);useEffect(()=>{api.getBootstrap().then(d=>{setEvents(d?.events||[]);setCal(d?.academicCalendar||[])}).catch(()=>{})},[]);return <div className="content"><section className="page-title"><div><div className="eyebrow">Akademik</div><h1>Kalender Akademik</h1><p>Agenda sekolah dan kalender akademik terhubung ke Google Sheets.</p></div></section><section className="card"><div className="card-head"><div><h2>Agenda sekolah</h2><p>{events.length} agenda</p></div></div>{events.length?events.map(x=><div className="event" key={x.id}><div className="date-box"><b>{String(x.eventDate||"").slice(8,10)||"—"}</b><span>OKT</span></div><div><b>{x.title}</b><span>{x.eventDate} · {formatTime(x.startTime)}{x.endTime?"–"+formatTime(x.endTime):""}</span></div></div>):<p>Belum ada agenda.</p>}</section><section className="card"><div className="card-head"><div><h2>Hari penting</h2><p>{cal.length} data kalender</p></div></div>{cal.length?cal.map(x=><div className="event" key={x.id}><div className="date-box"><b>{String(x.date||"").slice(8,10)||"—"}</b><span>OKT</span></div><div><b>{x.title}</b><span>{x.date} · {x.isNationalHoliday?"Libur nasional":"Kalender akademik"}</span></div></div>):<p>Belum ada data kalender akademik.</p>}</section></div>}

function DrivePage(){const [data,setData]=useState({configured:false,files:[]});useEffect(()=>{api.getDriveMaterials().then(setData).catch(()=>{})},[]);return <div className="content"><section className="page-title"><div><div className="eyebrow">Google Drive</div><h1>Drive Materi</h1><p>Materi mengajar yang tersimpan di folder Google Drive sekolah.</p></div>{data.folderUrl&&<a className="primary" href={data.folderUrl} target="_blank" rel="noreferrer">Buka folder Drive</a>}</section><section className="card">{!data.configured?<p>Folder Drive belum dikonfigurasi.</p>:data.files.length?data.files.map(x=><div className="event" key={x.id}><div className="date-box"><FileText size={22}/></div><div><b>{x.name}</b><span>{x.mimeType} · {Math.round((x.size||0)/1024)} KB</span></div><a className="text-btn" href={x.url} target="_blank" rel="noreferrer">Buka</a></div>):<p>Folder Drive masih kosong.</p>}</section></div>}
function SubstitutePage({user}){
 const [form,setForm]=useState({date:"2026-10-07",startTime:"07:00",endTime:"08:20",className:"",topic:"",room:"",reason:""}); const [candidates,setCandidates]=useState([]); const [selected,setSelected]=useState(null); const [requests,setRequests]=useState([]); const [loading,setLoading]=useState(false); const [message,setMessage]=useState("");
 const search=()=>{setLoading(true);setMessage("");api.findSubstituteCandidates(form).then(r=>setCandidates(r?.candidates||r||[])).catch(e=>setMessage(e.message||String(e))).finally(()=>setLoading(false));};
 const send=()=>{if(!selected)return;setLoading(true);api.saveSubstitution({...form,substituteTeacherEmail:selected.email}).then(()=>{setMessage("Permintaan guru pengganti berhasil dikirim.");setSelected(null);setCandidates([]);return api.getSubstitutionRequests()}).then(r=>setRequests(r?.requests||r||[])).catch(e=>setMessage(e.message||String(e))).finally(()=>setLoading(false));};
 useEffect(()=>{api.getSubstitutionRequests().then(r=>setRequests(r?.requests||r||[])).catch(()=>{})},[]);
 return <div className="content"><section className="page-title"><div><div className="eyebrow">Kolaborasi</div><h1>Guru Pengganti</h1><p>Cari guru matematika yang tidak bentrok jadwal untuk menggantikan kelas Anda.</p></div></section><section className="card"><div className="two"><label>Tanggal<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Kelas<input value={form.className} onChange={e=>setForm({...form,className:e.target.value})} placeholder="VIII-A"/></label></div><div className="two"><label>Mulai<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Selesai<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label></div><div className="two"><label>Materi<input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}/></label><label>Ruangan<input value={form.room} onChange={e=>setForm({...form,room:e.target.value})}/></label></div><label>Alasan<input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Berhalangan hadir"/></label><button className="primary" onClick={search} disabled={loading}>{loading?"Mencari...":"Cari guru yang tersedia"}</button>{message&&<p>{message}</p>}</section>{candidates.length>0&&<section className="card"><div className="card-head"><div><h2>Guru tersedia</h2><p>Pilih salah satu guru untuk mengirim permintaan.</p></div></div>{candidates.map(x=><div className="todo-row" key={x.email}><div className="todo-copy"><b>{x.name||x.email}</b><span>{x.email}</span><small>{x.available===false?"Bentrok jadwal":"Tersedia"}{x.dailyLoad!=null?" · Beban "+x.dailyLoad+" jadwal":""}</small></div><button className="secondary" disabled={x.available===false} onClick={()=>setSelected(x)}>{selected?.email===x.email?"Dipilih":"Pilih"}</button></div>)}{selected&&<button className="primary" onClick={send}>Kirim permintaan ke {selected.name||selected.email}</button>}</section>}<section className="card"><div className="card-head"><div><h2>Permintaan masuk</h2><p>Permintaan yang ditujukan kepada Anda.</p></div></div>{requests.length?requests.map(x=><div className="todo-row" key={x.id}><div className="todo-copy"><b>{x.className} · {x.date}</b><span>{formatTime(x.startTime)}–{formatTime(x.endTime)} · {x.topic||"Tanpa materi"}</span></div><span className="priority sedang">{x.status}</span></div>):<p>Belum ada permintaan.</p>}</section></div>}
function SchedulePage({user}){
  const [items,setItems]=useState([]);
  const [show,setShow]=useState(false);
  const [view,setView]=useState("mine");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [form,setForm]=useState({day:"Senin",startTime:"07:00",endTime:"08:20",className:"",topic:"",room:""});
  const load=()=>api.getBootstrap().then(d=>setItems(d?.allSchedule||[])).catch(e=>setError(e.message||String(e)));
  useEffect(()=>{load()},[]);
  const mine=items.filter(x=>String(x.teacherEmail||"").toLowerCase()===String(user?.email||"").toLowerCase());
  const visible=(view==="mine"?mine:items).slice().sort((a,b)=>{const days={Senin:1,Selasa:2,Rabu:3,Kamis:4,Jumat:5,Sabtu:6,Minggu:7};return (days[a.day]||99)-(days[b.day]||99)||String(formatTime(a.startTime)||"").localeCompare(String(formatTime(b.startTime)||""));});
  const save=async()=>{
    if(!form.className.trim()){setError("Nama kelas wajib diisi.");return;}
    if(!form.startTime||!form.endTime){setError("Jam mulai dan selesai wajib diisi.");return;}
    if(form.startTime>=form.endTime){setError("Jam selesai harus lebih besar dari jam mulai.");return;}
    setSaving(true);setError("");
    try{
      await api.saveSchedule({...form,className:form.className.trim(),topic:form.topic.trim(),room:form.room.trim()});
      const data=await api.getBootstrap();
      setItems(data?.allSchedule||[]);
      setShow(false);
      setForm({day:"Senin",startTime:"07:00",endTime:"08:20",className:"",topic:"",room:""});
    }catch(e){setError(e.message||String(e));}
    finally{setSaving(false);}
  };
  return <div className="content"><section className="page-title"><div><div className="eyebrow">Jadwal</div><h1>Jadwal Mengajar</h1><p>Jadwal tersimpan bersama di Google Sheets dan dapat dilihat oleh guru matematika.</p></div><button className="primary add-schedule-btn" type="button" title="Tambah jadwal mengajar" onClick={()=>setShow(true)}><CirclePlus size={18}/> Tambah jadwal</button></section>{error&&<div className="card" style={{marginBottom:16}}>{error}</div>}<section className="card"><div className="card-head"><div><h2>{view==="mine"?"Jadwal saya":"Jadwal semua guru"}</h2><p>{visible.length} jadwal tersimpan</p></div><div style={{display:"flex",gap:8}}><button className={view==="mine"?"primary":"secondary"} onClick={()=>setView("mine")}>Jadwal saya</button><button className={view==="all"?"primary":"secondary"} onClick={()=>setView("all")}>Semua guru</button></div></div><div className="schedule-list">{visible.length?visible.map(s=><div className="schedule-row" key={s.id}><div className="time"><b>{s.startTime}</b><span>{s.endTime}</span></div><div className="line"><i></i></div><div className="lesson"><div><b>{s.day} · {s.className}</b><span>{s.topic||"Tanpa topik"}{view==="all"&&s.teacherEmail?" · "+s.teacherEmail:""}</span></div><small>{s.room||"-"}</small></div></div>):<p style={{padding:20}}>Belum ada jadwal. Klik “Tambah jadwal”.</p>}</div></section>{show&&<div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><h2>Tambah jadwal</h2><p>Jadwal akan tersimpan ke Google Sheets.</p></div><button className="icon-btn" onClick={()=>setShow(false)}><X/></button></div><label>Hari<select value={form.day} onChange={e=>setForm({...form,day:e.target.value})}>{["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"].map(x=><option key={x}>{x}</option>)}</select></label><div className="two"><label>Mulai<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Selesai<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label></div><label>Kelas<input value={form.className} onChange={e=>setForm({...form,className:e.target.value})} placeholder="VIII-A"/></label><label>Materi / Topik<input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="Persamaan Linear"/></label><label>Ruangan<input value={form.room} onChange={e=>setForm({...form,room:e.target.value})} placeholder="R. 201"/></label><div className="modal-actions"><button className="secondary" type="button" onClick={()=>setShow(false)}>Batal</button><button className="primary" type="button" disabled={saving||!form.className.trim()} onClick={save}>{saving?"Menyimpan...":"Simpan jadwal"}</button></div></div></div>}</div>
}
function Placeholder({title}){return <div className="content"><section className="empty card"><div className="empty-icon"><CalendarDays size={28}/></div><h1>{title}</h1><p>Modul ini sudah disiapkan di Math Up dan akan kita sambungkan ke data Google Sheets/Drive pada tahap berikutnya.</p><button className="primary">Siapkan modul</button></section></div>}
function TodoModal({onClose,onSave}){const [title,setTitle]=useState("");const [desc,setDesc]=useState("");const [due,setDue]=useState("");const [priority,setPriority]=useState("Sedang");return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><h2>Tugas baru</h2><p>Tambahkan pekerjaan yang perlu diselesaikan.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><label>Nama tugas<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Siapkan soal..." /></label><label>Deskripsi<textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Detail tugas..." /></label><div className="two"><label>Deadline<input value={due} onChange={e=>setDue(e.target.value)} placeholder="8 Okt 2026, 16:00" /></label><label>Prioritas<select value={priority} onChange={e=>setPriority(e.target.value)}><option>Rendah</option><option>Sedang</option><option>Tinggi</option></select></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Batal</button><button className="primary" disabled={!title.trim()} onClick={()=>onSave({title,desc,due:due||"Belum ditentukan",priority})}>Simpan tugas</button></div></div></div>}

export default App;