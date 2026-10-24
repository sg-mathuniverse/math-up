import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import {
  Bell, CalendarDays, CalendarClock, CheckCircle2, ChevronDown, CirclePlus, Clock3,
  FileText, LayoutDashboard, ListTodo, Menu, Search,
  Settings, Users, UserRoundCheck, UserRound, X, BookOpen, Sparkles, Mail, HardDrive, History
} from "lucide-react";

const schedule = [
  {time:"07:00", end:"08:20", className:"VIII-A", topic:"Persamaan Linear Dua Variabel", room:"R. 201"},
  {time:"09:00", end:"10:20", className:"IX-B", topic:"Peluang", room:"R. 104"},
  {time:"11:00", end:"12:20", className:"VII-C", topic:"Aritmetika Sosial", room:"R. 203"}
];


const DEFAULT_ACADEMIC_CALENDAR_2026=[
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

function App(){
  const [active,setActive]=useState("Dashboard");
  const [authChecked,setAuthChecked]=useState(false);
  const [authUser,setAuthUser]=useState(null);
  const [todos,setTodos]=useState([]);
  const [menuOpen,setMenuOpen]=useState(false);
  const [profileMenuOpen,setProfileMenuOpen]=useState(false);
  const [showTodo,setShowTodo]=useState(false);
  const [editingTodo,setEditingTodo]=useState(null);
  const [confirmTodo,setConfirmTodo]=useState(null);
  const [query,setQuery]=useState("");
  const [user,setUser]=useState(null);
  const [dashboard,setDashboard]=useState({schedule:[],events:[],allSchedule:[],academicCalendar:[]});
  const [loading,setLoading]=useState(true);
  const [apiError,setApiError]=useState("");
  const [todoActionLoading,setTodoActionLoading]=useState("");
  const [substitutionNotifications,setSubstitutionNotifications]=useState([]);

  useEffect(()=>{
    let cancelled=false;
    const loadWorkspace=async()=>{
      try{
        // Bootstrap already includes the authenticated user, so avoid a
        // separate serial getCurrentUser request during the initial load.
        const d=await api.getBootstrap();
        if(cancelled)return;
        const u=d?.user||null;
        setAuthUser(u);
        if(!u?.email)return;
        setUser(u);
        setTodos(d?.todos||[]);
        setDashboard({
          schedule:d?.schedule||[],
          events:(d?.events||[]).map(x=>({...x,eventDate:normalizeCalendarDate(x.eventDate)})),
          allSchedule:d?.allSchedule||[],
          academicCalendar:d?.academicCalendar||[]
        });

        // Show the workspace before loading supplementary notifications.
        setAuthChecked(true);
        setLoading(false);
        api.getSubstitutionRequests().then(requests=>{
          if(!cancelled)setSubstitutionNotifications(
            Array.isArray(requests?.requests)?requests.requests:(Array.isArray(requests)?requests:[])
          );
        }).catch(()=>{
          if(!cancelled)setSubstitutionNotifications([]);
        });
      }catch(e){
        if(!cancelled)setApiError(e.message||String(e));
      }finally{
        if(!cancelled){
          setAuthChecked(true);
          setLoading(false);
        }
      }
    };
    loadWorkspace();
    return()=>{cancelled=true};
  },[]);

  // Refresh jadwal efektif saat tab kembali aktif dan secara berkala agar persetujuan pertukaran segera terlihat.
  useEffect(()=>{
    if(!authUser?.email)return;
    let cancelled=false;
    const refresh=async()=>{
      if(document.visibilityState==="hidden")return;
      try{
        const d=await api.getBootstrap();
        if(cancelled)return;
        setDashboard({
          schedule:d?.schedule||[],
          events:(d?.events||[]).map(x=>({...x,eventDate:normalizeCalendarDate(x.eventDate)})),
          allSchedule:d?.allSchedule||[]
        });
      }catch(e){}
      try{
        const requests=await api.getSubstitutionRequests();
        if(!cancelled)setSubstitutionNotifications(
          Array.isArray(requests?.requests)?requests.requests:(Array.isArray(requests)?requests:[])
        );
      }catch(e){}
    };
    const onFocus=()=>refresh();
    window.addEventListener("focus",onFocus);
    const timer=window.setInterval(refresh,60000);
    return()=>{
      cancelled=true;
      window.removeEventListener("focus",onFocus);
      window.clearInterval(timer);
    };
  },[authUser?.email]);

  const filteredTodos=useMemo(()=>todos.filter(t=>String(t?.title||"").toLowerCase().includes(query.toLowerCase())),[todos,query]);

  if(!authChecked || loading) return <LoadingScreen/>;

  if(!authUser?.email) return <LoginScreen error={apiError}/>;

  const toggleTodo=async id=>{const t=todos.find(x=>x.id===id);if(!t||todoActionLoading)return;setTodoActionLoading("toggle:"+id);setApiError("");try{await api.toggleTodo(id,!t.done);setTodos(ts=>ts.map(x=>x.id===id?{...x,done:!x.done}:x));}catch(e){setApiError(e.message||String(e));}finally{setTodoActionLoading("");}};
  const requestTodoToggle=id=>{const t=todos.find(x=>x.id===id);if(t&&!todoActionLoading)setConfirmTodo(t);};
  const confirmTodoToggle=()=>{if(!confirmTodo)return;const id=confirmTodo.id;toggleTodo(id);setConfirmTodo(null)};
  const refreshDashboard=async()=>{
    const d=await api.getBootstrap();
    setDashboard({
      schedule:d?.schedule||[],
      events:(d?.events||[]).map(x=>({...x,eventDate:normalizeCalendarDate(x.eventDate)})),
      allSchedule:d?.allSchedule||[]
    });
    try{
      const requests=await api.getSubstitutionRequests();
      setSubstitutionNotifications(Array.isArray(requests?.requests)?requests.requests:(Array.isArray(requests)?requests:[]));
    }catch(e){}
  };

  return <div className="app">
    <aside
      className={menuOpen?"sidebar open":"sidebar"}
      onMouseEnter={()=>{if(window.matchMedia("(min-width: 901px)").matches)setMenuOpen(true)}}
      onMouseLeave={()=>{if(window.matchMedia("(min-width: 901px)").matches)setMenuOpen(false)}}
    >
      <div className="brand" role="button" tabIndex={0} aria-label={menuOpen?"Tutup menu":"Buka menu"} onClick={()=>setMenuOpen(v=>!v)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setMenuOpen(v=>!v)}}}><div className="brand-mark sidebar-math-logo" aria-label="pi integral a sampai b f kuadrat x dx"><span className="pi">π</span><span className="integral-wrap"><span className="integral">∫</span><span className="limits"><sup>b</sup><sub>a</sub></span></span><span className="formula">f²(x) dx</span></div><div className="brand-name"><strong>Ruang</strong><strong>Math Up</strong></div></div>
      <nav>
        <Nav icon={<LayoutDashboard size={19}/>} label="Dashboard" active={active==="Dashboard"} onClick={()=>setActive("Dashboard")}/>
        <Nav icon={<CalendarClock size={19}/>} label="Jadwal Mengajar" active={active==="Jadwal Mengajar"} onClick={()=>setActive("Jadwal Mengajar")}/>
        <Nav icon={<UserRoundCheck size={19}/>} label="Guru Pengganti" active={active==="Guru Pengganti"} onClick={()=>setActive("Guru Pengganti")}/>
        <Nav icon={<ListTodo size={19}/>} label="To-Do" active={active==="To-Do"} onClick={()=>setActive("To-Do")} todoCount={todos.filter(t=>!t.done).length}/>
        <Nav icon={<CalendarDays size={19}/>} label="Kalender Akademik" active={active==="Kalender Akademik"} onClick={()=>setActive("Kalender Akademik")}/>
        <Nav icon={<FileText size={19}/>} label="Drive Materi" active={active==="Drive Materi"} onClick={()=>setActive("Drive Materi")}/>
        <Nav icon={<History size={19}/>} label="Patch Note" active={active==="Patch Note"} onClick={()=>setActive("Patch Note")}/>
      </nav>
      <div className="sidebar-bottom">
        <Nav icon={<Settings size={19}/>} label="Pengaturan" active={active==="Pengaturan"} onClick={()=>setActive("Pengaturan")}/>
      </div>
    </aside>

    <main className="main" onClick={()=>{if(menuOpen)setMenuOpen(false);if(profileMenuOpen)setProfileMenuOpen(false)}}>
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={()=>setMenuOpen(v=>!v)}><Menu size={20}/></button>
        <div className="crumb"><strong>RMU 3.0</strong></div>
        <div className="top-actions">
          <form className="search google-search" action="https://www.google.com/search" method="get" target="_blank"><Search size={17}/><input name="q" placeholder="Cari di Google..." aria-label="Cari di Google" /></form>
          <a className="icon-btn top-link" href="https://mail.google.com/" target="_blank" rel="noreferrer" title="Buka Gmail" aria-label="Buka Gmail"><Mail size={19}/></a>
          <a className="icon-btn top-link" href="https://drive.google.com/" target="_blank" rel="noreferrer" title="Buka Google Drive" aria-label="Buka Google Drive"><HardDrive size={19}/></a>
          <button className="icon-btn notification-btn" onClick={()=>setActive("Guru Pengganti")} title="Notifikasi guru pengganti" aria-label="Notifikasi guru pengganti"><Bell size={19}/>{substitutionNotifications.length>0&&<i></i>}{substitutionNotifications.length>0&&<em>{substitutionNotifications.length>9?"9+":substitutionNotifications.length}</em>}</button>
          <div className="profile-menu-wrap" onClick={e=>e.stopPropagation()}>
            <button className="user-chip" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={()=>setProfileMenuOpen(v=>!v)}><div className="avatar small">{user?.photoUrl?<img src={user.photoUrl} alt={user.name||"Profil"} />:initials(user?.name||user?.email||"?")}</div><ChevronDown size={15}/></button>
            {profileMenuOpen&&<div className="profile-dropdown" role="menu">
              <div className="profile-dropdown-user"><div className="avatar">{user?.photoUrl?<img src={user.photoUrl} alt={user.name||"Profil"} />:initials(user?.name||user?.email||"?")}</div><div><b>{user?.name||"Guru"}</b><span>{user?.email||""}</span></div></div>
              <button role="menuitem" onClick={()=>{setActive("Profil Saya");setProfileMenuOpen(false)}}><UserRound size={17}/> Profil Saya</button>
              <button role="menuitem" onClick={()=>{setActive("Daftar Guru Aktif");setProfileMenuOpen(false)}}><Users size={17}/> Daftar Guru Aktif</button>
            </div>}
          </div>
        </div>
      </header>

      {active==="Dashboard" ? <Dashboard todos={filteredTodos} toggleTodo={requestTodoToggle} todoActionLoading={todoActionLoading} schedule={dashboard.schedule} allSchedule={dashboard.allSchedule} events={dashboard.events} academicCalendar={dashboard.academicCalendar} user={user} substitutionNotifications={substitutionNotifications} /> :
       active==="Jadwal Mengajar" ? <SchedulePage user={user} /> : active==="Guru Pengganti" ? <SubstitutePage user={user} onSubstitutionUpdated={refreshDashboard} /> :
       active==="Kalender Akademik" ? <CalendarPage /> :
       active==="Drive Materi" ? <DrivePage /> :
       active==="Profil Saya" ? <ProfilePage user={user} onUserUpdated={setUser} /> :
       active==="Daftar Guru Aktif" ? <ActiveTeachersPage /> :
       active==="Pengaturan" ? <SettingsPage /> :
       active==="To-Do" ? <TodoPage todos={filteredTodos} toggleTodo={requestTodoToggle} actionLoading={todoActionLoading} onAdd={()=>{if(todoActionLoading)return;setEditingTodo(null);setShowTodo(true)}} onEdit={t=>{if(todoActionLoading)return;setEditingTodo(t);setShowTodo(true)}} onDelete={async t=>{if(!window.confirm("Hapus tugas ini?"))return;setTodoActionLoading("delete:"+String(t.id));setApiError("");try{await api.deleteTodo(t.id);setTodos(ts=>ts.filter(x=>x.id!==t.id));}catch(e){setApiError(e.message||String(e));}finally{setTodoActionLoading("");}}} /> :
       active==="Patch Note" ? <PatchNotesPage /> : <Placeholder title={active} />}

      {apiError && <div className="card" style={{margin:"16px"}}>{apiError}</div>}
      {confirmTodo&&<div className="modal-backdrop"><div className="modal confirm-modal"><div className="modal-head"><div><h2>{confirmTodo.done?"Buka kembali tugas?":"Konfirmasi tugas selesai"}</h2><p>{confirmTodo.done?"Tugas ini akan dikembalikan ke daftar tugas aktif.":"Pastikan tugas ini benar-benar sudah selesai dikerjakan."}</p></div><button className="icon-btn" onClick={()=>{if(!todoActionLoading)setConfirmTodo(null)}} disabled={!!todoActionLoading}><X/></button></div><div className="confirm-task"><b>{confirmTodo.title}</b><span>{confirmTodo.description||confirmTodo.desc||"Tanpa deskripsi"}</span></div><div className="modal-actions"><button className="secondary" onClick={()=>setConfirmTodo(null)} disabled={!!todoActionLoading}>Batal</button><button className="primary" onClick={confirmTodoToggle} disabled={!!todoActionLoading}>{todoActionLoading?<><span className="button-spinner"></span>Memproses...</>:confirmTodo.done?"Buka kembali":"Ya, sudah selesai"}</button></div></div></div>}
      {showTodo && <TodoModal initial={editingTodo} saving={todoActionLoading==="save"}  onClose={()=>{setShowTodo(false);setEditingTodo(null)}} onSave={async t=>{setApiError("");setTodoActionLoading("save");try{await api.saveTodo({id:editingTodo?.id,title:t.title,description:t.desc,dueAt:t.due,priority:t.priority,done:editingTodo?.done||false});const fresh=await api.getBootstrap();setTodos(fresh?.todos||[]);setShowTodo(false);setEditingTodo(null);}catch(e){setApiError(e.message||String(e));}finally{setTodoActionLoading("");}}}/>} 
    </main>
  </div>
}


function LoadingScreen(){
  return <div className="auth-screen"><div className="auth-card loading-card"><div className="brand-mark login-math-logo" role="img" aria-label="limit norma delta menuju nol, jumlah dari i sama dengan satu sampai n, pi kali f dari c i kuadrat, delta x i"><span className="limit-part"><span className="limit-symbol">lim</span><span className="limit-condition">‖Δ‖ → 0</span></span><span className="sum-part"><span className="sum-upper">n</span><b>∑</b><span className="sum-lower">i=1</span></span><span className="equation-part"><span className="math-italic">π</span> [<span className="math-italic">f</span>(c<sub>i</sub>)]<sup>2</sup> Δx<sub>i</sub></span></div><div className="loading-spinner" aria-hidden="true"></div><div className="eyebrow loading-eyebrow">Menyiapkan</div><h1>Ruang Math Up</h1><p>Memuat profil, jadwal, tugas, dan agenda Anda. Mohon tunggu sampai Ruang Math Up selesai dimuat.</p><div className="loading-track"><span></span></div><small>Jangan tutup halaman ini selama proses pemuatan.</small></div></div>;
}

function LoginScreen({error}){
  const loginUrl=(import.meta.env.VITE_APPS_SCRIPT_URL||"").replace(/\/$/,"");
  return <div className="auth-screen"><div className="auth-card">
    <div className="brand-mark login-math-logo" role="img" aria-label="limit norma delta menuju nol, jumlah dari i sama dengan satu sampai n, pi kali f dari c i kuadrat, delta x i"><span className="limit-part"><span className="limit-symbol">lim</span><span className="limit-condition">‖Δ‖ → 0</span></span><span className="sum-part"><span className="sum-upper">n</span><b>∑</b><span className="sum-lower">i=1</span></span><span className="equation-part"><span className="math-italic">π</span> [<span className="math-italic">f</span>(c<sub>i</sub>)]<sup>2</sup> Δx<sub>i</sub></span></div>
    <div className="eyebrow">Ruang Math Up</div>
    <h1>Masuk ke Ruang Math Up</h1>
    <p>Gunakan akun Google sekolah Anda. Ruang Math Up akan mengambil identitas akun secara aman dari Google Apps Script.</p>
    {error&&<div className="auth-error">{error}</div>}
    <a className="google-login" href={loginUrl} target="_blank" rel="noreferrer">
      <span className="google-g">G</span> Masuk dengan Google
    </a>
    <p className="auth-hint">Setelah Google selesai memverifikasi akun, kembali ke tab Ruang Math Up lalu muat ulang halaman.</p>
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

function Dashboard({todos,toggleTodo,schedule,allSchedule,events,academicCalendar=[],user,substitutionNotifications=[]}){
 const [now,setNow]=useState(new Date());
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer)},[]);
 const weekdayMap={Sunday:"Minggu",Monday:"Senin",Tuesday:"Selasa",Wednesday:"Rabu",Thursday:"Kamis",Friday:"Jumat",Saturday:"Sabtu"};
 const currentDay=weekdayMap[new Intl.DateTimeFormat("en-US",{weekday:"long"}).format(now)]||"";
 const activeSchedule=(schedule||[]).filter(s=>String(s.day||"").trim().toLowerCase()===currentDay.toLowerCase()).slice().sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)));
 const weeklySchedule=(allSchedule||[]).filter(x=>String(x.teacherEmail||"").toLowerCase()===String(user?.email||"").toLowerCase());
 const todayKey=normalizeCalendarDate(now).slice(0,10);
 const futureDashboardEvents=(events||[]).filter(x=>normalizeCalendarDate(x.eventDate).slice(0,10)>=todayKey).slice().sort((a,b)=>normalizeCalendarDate(a.eventDate).slice(0,10).localeCompare(normalizeCalendarDate(b.eventDate).slice(0,10)));
 const activeEventGroups=[];
 const dashboardDayNumber=date=>{const m=String(date||"").slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]))/86400000:NaN};
 futureDashboardEvents.forEach(event=>{
   const title=String(event.title||"Agenda sekolah").trim(),date=normalizeCalendarDate(event.eventDate).slice(0,10);
   const matching=activeEventGroups.filter(group=>group.title.trim().toLocaleLowerCase("id-ID")===title.toLocaleLowerCase("id-ID"));
   const last=matching[matching.length-1];
   if(last&&dashboardDayNumber(date)-dashboardDayNumber(last.events[last.events.length-1].eventDate)===1)last.events.push(event);
   else activeEventGroups.push({title,events:[event]});
 });
 activeEventGroups.sort((a,b)=>String(a.events[0].eventDate).localeCompare(String(b.events[0].eventDate)));
 const activeEvents=activeEventGroups.slice(0,3);
 const priorityRank={Tinggi:0,Sedang:1,Rendah:2};
 const activeTodos=(todos||[]).filter(t=>!t.done).slice().sort((a,b)=>{
   const ad=todoDueTimestamp(a),bd=todoDueTimestamp(b);
   if(ad!==bd)return ad-bd;
   return (priorityRank[a.priority]??99)-(priorityRank[b.priority]??99);
 });
 const runningMessages=[];
 const nowMinutes=now.getHours()*60+now.getMinutes();
 const scheduleTimeMinutes=v=>{const m=String(formatTime(v)||"").match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):NaN};
 const ongoingSchedule=activeSchedule.find(s=>{const start=scheduleTimeMinutes(s.startTime),end=scheduleTimeMinutes(s.endTime);return Number.isFinite(start)&&Number.isFinite(end)&&start<=nowMinutes&&nowMinutes<end;});
 const nextSchedule=activeSchedule.find(s=>{const start=scheduleTimeMinutes(s.startTime);return Number.isFinite(start)&&start>nowMinutes;});
 const currentOrNextSchedule=ongoingSchedule||nextSchedule;
 runningMessages.push("Hallo Ges siap mengajar hari ini 💪?");
 if(currentOrNextSchedule){
   const verb=ongoingSchedule?"Semangat beraktifitas di":"Seharusnya kamu di";
   runningMessages.push(verb+" "+(currentOrNextSchedule.className||"kelas yang dijadwalkan")+" untuk mengisi "+(currentOrNextSchedule.topic||"materi hari ini")+" pada pukul "+formatTime(currentOrNextSchedule.startTime)+".");
 }else{
   runningMessages.push("JANGAN Lupa Weekly Plan Ges, Refleksinya itu Lho");
 }
 const todayDate=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const dueDateOf=t=>{
   const ts=todoDueTimestamp(t);
   if(!Number.isFinite(ts)||ts===Number.MAX_SAFE_INTEGER)return null;
   const d=new Date(ts);
   return new Date(d.getFullYear(),d.getMonth(),d.getDate());
 };
 const overdue=activeTodos.filter(t=>{const d=dueDateOf(t);return d&&d<todayDate;});
 overdue.forEach(t=>runningMessages.push("Loh e apa kau lupa "+t.title+" ?"));
 activeTodos.forEach(t=>{
   const d=dueDateOf(t);
   if(!d||d<todayDate)return;
   const daysLeft=Math.round((d-todayDate)/86400000);
   const important=String(t.priority||"").trim().toLowerCase()==="tinggi";
   const title=String(t.title||"To-Do").trim();
   let reminder="";
   if(daysLeft===3)reminder="Deadline To-do "+title+" tersisa 3 hari lagi.";
   else if(daysLeft===2)reminder="Ges, deadline "+title+" tersisa 2 hari lagi.";
   else if(daysLeft===1)reminder="Ayo ges Besok deadline "+title+" looh!!";
   else if(daysLeft===0)reminder="INGAT, hari ini deadline "+title+" ya ges.";
   if(reminder)runningMessages.push((important?"PENTING! ":"")+reminder);
 });
 const holidayItems=[...DEFAULT_ACADEMIC_CALENDAR_2026,...(academicCalendar||[])];
 const todayHolidays=[...new Map(holidayItems.filter(x=>normalizeCalendarDate(x.date||x.eventDate)===todayKey).map(x=>[String(x.title||x.name||""),x])).values()];
 todayHolidays.forEach(x=>runningMessages.push("Ges, hari ini bertepatan dengan "+(x.title||x.name||"hari besar")+"."));
 if(substitutionNotifications.length)runningMessages.push("Ada "+substitutionNotifications.length+" permintaan guru pengganti yang perlu diperiksa.");
 runningMessages.push("Matematika Pelajaranku, GenIUS sekolahku, KASIH PAHAM 👊");
 const days=["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
 const slots=["08:00-08:40","08:40-09:20","09:20-10:00","10:00-10:15","10:15-10:55","10:55-11:35","11:35-12:15","12:15-13:00","13:00-13:40","13:40-14:20","14:20-15:00","15:00-15:40","15:40-16:20","16:20-17:00"];
 const toMin=v=>{const m=String(v||"").match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):NaN};
 const slotData=(day,slot)=>{
   const [ss,ee]=slot.split("-"),s=toMin(ss),e=toMin(ee);
   return weeklySchedule.filter(x=>String(x.day||"").toLowerCase()===day.toLowerCase()).filter(x=>{
     const a=toMin(formatTime(x.startTime)),b=toMin(formatTime(x.endTime));
     return Number.isFinite(a)&&Number.isFinite(b)&&a<e&&b>s;
   });
 };
 const dateLabel=new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(now);
 const timeLabel=new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(now).replaceAll(".",":");
 return <div className="content">
   <section className="hero dashboard-hero">
     <div className="hero-main">
       <div className="hero-date">{dateLabel}</div>
       <div className="eyebrow"><Sparkles size={14}/> Selamat datang di Ruang Math Up</div>
       <h1>Halo, {user?.name||"Guru"}! 👋</h1>
       <div className="running-wrap"><span className="running-label">Info</span><div className="running-track"><div className="running-text">{runningMessages.map((m,i)=><span key={i}>{m}</span>)}</div></div></div>
     </div>
     <div className="hero-clock"><span>Waktu sekarang</span><strong>{timeLabel}</strong></div>
   </section>

   <div className="dashboard-three-cards">
     <section className="card dashboard-mini-card">
       <div className="card-head dashboard-section-head"><div className="section-title-icon"><BookOpen size={18}/><div><h2>Jadwal mengajar hari ini</h2><p>Jadwal Anda untuk hari ini</p></div></div></div>
       <div className="schedule-list">{activeSchedule.length?activeSchedule.map((s,i)=><div className="schedule-row" key={s.id||s.startTime+i}><div className="time"><b>{formatTime(s.startTime)}</b><span>{formatTime(s.endTime)}</span></div><div className="line"><i></i></div><div className="lesson"><div><b>{s.className}</b><span>{s.topic||"Tanpa topik"}</span>{s.scheduleType==="Pengganti"&&<span className="schedule-substitution-label">Guru Pengganti</span>}</div><small>{s.room||"-"}</small></div></div>):<p style={{padding:20}}>Belum ada jadwal untuk hari ini.</p>}</div>
     </section>
     <section className="card dashboard-mini-card">
       <div className="card-head dashboard-section-head"><div className="section-title-icon"><ListTodo size={18}/><div><h2>To-Do List</h2><p>Deadline terdekat</p></div></div></div>
       <div className="todo-list">{activeTodos.slice(0,4).map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)}/>)}</div>
     </section>
     <section className="card dashboard-mini-card">
       <div className="card-head dashboard-section-head"><div className="section-title-icon"><CalendarDays size={18}/><div><h2>Agenda akademik</h2><p>Agenda terdekat</p></div></div></div>
       <div className="events">{activeEvents.length?activeEvents.map((group,i)=>{
       const first=group.events[0],last=group.events[group.events.length-1];
       const month=new Intl.DateTimeFormat("id-ID",{month:"short"}).format(new Date(String(first.eventDate).slice(0,10)+"T00:00:00"));
       const dayLabel=group.events.length>1?String(first.eventDate).slice(8,10)+"–"+String(last.eventDate).slice(8,10):String(first.eventDate).slice(8,10);
       const meta=(group.events.length>1?formatDate(first.eventDate)+" – "+formatDate(last.eventDate):formatDate(first.eventDate))+(first.startTime?" · "+formatTime(first.startTime):"");
       return <div className="event dashboard-grouped-event" key={String(first.id||first.eventDate)+"-"+i}><div className={"date-box "+(group.events.length>1?"date-box-fraction":"")}>{group.events.length>1?<><span>{String(first.eventDate).slice(8,10)}</span><i></i><span>{String(last.eventDate).slice(8,10)}</span></>:<span>{dayLabel}</span>}<span>{month}</span></div><div className="dashboard-event-copy"><b>{group.title}</b><span>{meta}</span></div></div>;
     }):<p>Belum ada agenda.</p>}</div>
     </section>
   </div>

   <section className="card weekly-schedule-card">
     <div className="card-head dashboard-section-head"><div className="section-title-icon"><CalendarDays size={18}/><div><h2>Jadwal mengajar Anda</h2><p>Jadwal mingguan sesuai akun guru yang sedang login</p></div></div></div>
     <div className="weekly-scroll"><table className="weekly-table"><thead><tr><th>Jam</th>{days.map(day=><th key={day}>{day}</th>)}</tr></thead><tbody>{slots.map(slot=><tr key={slot}><th>{slot}</th>{days.map(day=>{const items=slotData(day,slot);return <td key={day}>{items.length>0?items.map(x=><div className="weekly-lesson" key={x.id||x.className+x.startTime}><b>{x.className}</b><span>{x.topic||"Tanpa topik"}</span><small>{x.room||"-"}</small></div>):<span className="weekly-empty">—</span>}</td>})}</tr>)}</tbody></table></div>
   </section>
 </div>
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
function TodoPage({todos,toggleTodo,onAdd,onEdit,onDelete,actionLoading}){const active=todos.filter(t=>!t.done);const completed=todos.filter(t=>t.done);return <div className="content"><section className="page-title"><div><div className="eyebrow">Produktivitas pribadi</div><h1>To-Do</h1><p>Tugas ini hanya dapat dilihat dan dikelola oleh akun Anda.</p></div><button className="primary" onClick={onAdd}><CirclePlus size={18}/> Tambah tugas</button></section><section className="card todo-page-card"><div className="section-head"><div><b>Tugas aktif</b><p>{active.length} tugas belum selesai</p></div></div><div className="todo-list large todo-page-list">{active.length?active.map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)} onEdit={onEdit} onDelete={onDelete} actionLoading={actionLoading}/>):<p style={{padding:20}}>Belum ada tugas aktif.</p>}</div></section><section className="card todo-page-card" style={{marginTop:16}}><div className="section-head"><div><b>Riwayat tugas selesai</b><p>{completed.length} tugas telah diselesaikan</p></div></div><div className="todo-list large todo-page-list">{completed.length?completed.map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)}/>):<p style={{padding:20}}>Belum ada tugas yang diselesaikan.</p>}</div></section></div>}
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

function ProfilePage({user,onUserUpdated}) {
  const [form,setForm]=useState({name:user?.name||"",phone:user?.phone||""});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [photoUploading,setPhotoUploading]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let cancelled=false;
    api.getCurrentUser().then(fresh=>{
      if(cancelled)return;
      onUserUpdated?.(fresh);
      setForm({name:fresh?.name||"",phone:fresh?.phone||""});
    }).catch(e=>{if(!cancelled)setError(e.message||String(e))})
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[]);

  const save=async()=>{
    if(!form.name.trim()){setError("Nama guru wajib diisi.");return;}
    setSaving(true);setError("");setMessage("");
    try{
      const fresh=await api.saveMyProfile({name:form.name.trim(),phone:form.phone.trim()});
      onUserUpdated?.(fresh);
      setForm({name:fresh?.name||"",phone:fresh?.phone||""});
      setMessage("Profil berhasil disimpan.");
    }catch(e){setError(e.message||String(e));}
    finally{setSaving(false);}
  };

  const uploadPhoto=async event=>{
    const file=event.target.files?.[0];
    event.target.value="";
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
      setError("Pilih foto berformat JPG, PNG, atau WebP.");return;
    }
    if(file.size>8*1024*1024){
      setError("Ukuran file sumber maksimal 8 MB.");return;
    }
    setPhotoUploading(true);setError("");setMessage("");
    try{
      const bitmap=await createImageBitmap(file);
      let maxDimension=900,quality=0.82,blob=null;
      for(let attempt=0;attempt<6;attempt++){
        const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(bitmap.width*scale));
        canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        const context=canvas.getContext("2d");
        if(!context)throw new Error("Browser tidak dapat memproses foto ini.");
        context.drawImage(bitmap,0,0,canvas.width,canvas.height);
        blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
        if(blob&&blob.size<=512*1024)break;
        maxDimension=Math.round(maxDimension*0.82);
        quality=Math.max(0.48,quality-0.07);
      }
      bitmap.close?.();
      if(!blob||blob.size>512*1024)throw new Error("Foto masih terlalu besar. Pilih foto lain dengan ukuran lebih kecil.");
      const dataUrl=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result||""));
        reader.onerror=()=>reject(new Error("Foto gagal dibaca."));
        reader.readAsDataURL(blob);
      });
      const base64=dataUrl.split(",")[1]||"";
      const chunkSize=6000;
      const totalChunks=Math.ceil(base64.length/chunkSize);
      const uploadId=window.crypto?.randomUUID?.()||("upload_"+Date.now()+"_"+Math.random().toString(36).slice(2));
      let result=null;
      for(let index=0;index<totalChunks;index++){
        result=await api.uploadProfilePhotoChunk(
          uploadId,index,totalChunks,
          base64.slice(index*chunkSize,(index+1)*chunkSize),
          "image/jpeg"
        );
      }
      if(!result?.complete||!result?.user)throw new Error("Unggahan foto belum selesai. Silakan coba lagi.");
      onUserUpdated?.(result.user);
      setMessage("Foto profil berhasil diperbarui. Foto disimpan secara privat.");
    }catch(e){setError(e.message||String(e));}
    finally{setPhotoUploading(false);}
  };

  return <div className="content">
    <section className="page-title"><div><div className="eyebrow">Akun dan identitas</div><h1>Profil Saya</h1><p>Perbarui informasi yang digunakan oleh guru matematika di Ruang Math Up.</p></div></section>
    {error&&<div className="card profile-message error" role="alert">{error}</div>}
    {message&&<div className="card profile-message success" role="status">{message}</div>}
    <section className="card profile-card rmu-profile-card">
      <div className="profile-hero-row">
        <div className="avatar profile-large">{user?.photoUrl?<img src={user.photoUrl} alt={user?.name||"Profil"} />:initials(form.name||user?.email||"?")}</div>
        <div className="profile-photo-copy"><h2>{form.name||"Nama guru"}</h2><p>JPG, PNG, atau WebP. Foto diproses di browser dan disimpan di folder Drive privat.</p><label className={"profile-photo-upload"+(photoUploading?" uploading":"")}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={loading||saving||photoUploading}/><span>{photoUploading?"Mengunggah foto...":"Ganti foto profil"}</span></label></div>
      </div>
      <div className="form-grid">
        <label>Nama guru<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} maxLength={120} placeholder="Nama lengkap" disabled={loading||saving||photoUploading}/></label>
        <label>Email sekolah<input value={user?.email||""} disabled readOnly/><small>Email diambil dari akun Google yang sedang login dan tidak dapat diubah.</small></label>
        <label>Nomor HP<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} maxLength={30} placeholder="Contoh: 08xxxxxxxxxx" disabled={loading||saving||photoUploading}/></label>
      </div>
      <div className="profile-form-actions"><button className="primary" onClick={save} disabled={loading||saving||photoUploading}>{loading?"Memuat profil...":saving?"Menyimpan...":"Simpan perubahan"}</button></div>
    </section>
  </div>;
}

function ActiveTeachersPage(){
  const [teachers,setTeachers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");

  useEffect(()=>{
    let cancelled=false;
    api.getActiveTeachers().then(data=>{if(!cancelled)setTeachers(Array.isArray(data)?data:[])})
      .catch(e=>{if(!cancelled)setError(e.message||String(e))})
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[]);

  const filtered=teachers.filter(t=>
    [t.name,t.email,t.phone].some(value=>String(value||"").toLowerCase().includes(query.toLowerCase()))
  );

  return <div className="content">
    <section className="page-title"><div><div className="eyebrow">Kolaborasi internal</div><h1>Daftar Guru Aktif</h1><p>Direktori guru matematika yang terdaftar aktif di Ruang Math Up.</p></div></section>
    <section className="card active-teachers-card">
      <div className="card-head active-teachers-head"><div><h2>Guru Matematika</h2><p>{loading?"Memuat daftar guru...":teachers.length+" guru aktif"}</p></div><label className="active-teachers-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama, email, atau HP" aria-label="Cari guru aktif"/></label></div>
      {error&&<p className="profile-message error" role="alert">{error}</p>}
      {loading?<div className="loading-placeholder"><span className="loading-bar"></span><span className="loading-bar short"></span><span className="loading-bar"></span></div>:
       filtered.length?<div className="active-teachers-table-wrap"><table className="active-teachers-table"><thead><tr><th>Nama guru</th><th>Email sekolah</th><th>Nomor HP</th></tr></thead><tbody>{filtered.map(t=><tr key={t.id||t.email}><td><div className="directory-name"><div className="avatar small">{initials(t.name||t.email)}</div><b>{t.name||"Nama belum diisi"}</b></div></td><td>{t.email}</td><td>{t.phone||"Belum diisi"}</td></tr>)}</tbody></table></div>:<div className="empty-state">{query?"Tidak ada guru yang cocok dengan pencarian.":"Belum ada guru matematika aktif yang terdaftar."}</div>}
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
  const [editingEvent,setEditingEvent]=useState(null);
  const [month,setMonth]=useState(new Date(today.getFullYear(),today.getMonth(),1));
  const [selectedDate,setSelectedDate]=useState("");
  const [form,setForm]=useState({title:"",description:"",eventDate:"",startTime:"",endTime:"",type:"Agenda sekolah"});



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
      await (editingEvent ? api.updateEvent({id:editingEvent.id,title:form.title.trim(),description:form.description.trim(),eventDate:form.eventDate,startTime:form.startTime||"",endTime:form.endTime||"",type:form.type}) : api.saveEvent({title:form.title.trim(),description:form.description.trim(),eventDate:form.eventDate,startTime:form.startTime||"",endTime:form.endTime||"",type:form.type}));
      setMessage(editingEvent ? "Agenda sekolah berhasil diperbarui." : "Agenda sekolah berhasil ditambahkan dan dapat dilihat oleh semua guru.");
      setForm({title:"",description:"",eventDate:"",startTime:"",endTime:"",type:"Agenda sekolah"});
      setShowAdd(false); setEditingEvent(null); await load();
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
  [...DEFAULT_ACADEMIC_CALENDAR_2026,...cal].forEach(x=>{const k=String(x.date||"").slice(0,10);if(k)(byDate[k]??=[]).push({...x,kind:x.isNationalHoliday?"holiday":"important"})});
  events.forEach(x=>{const k=String(x.eventDate||"").slice(0,10);if(k)(byDate[k]??=[]).push({...x,kind:"school"})});

  const selectedItems=(byDate[selectedDate]||[]);
  const openAddFor=(date)=>{
    setError("");setMessage("");setEditingEvent(null);
    setForm({title:"",description:"",eventDate:date||"",startTime:"",endTime:"",type:"Agenda sekolah"});
    setShowAdd(true);
  };

  const openEdit=(event)=>{
    setError("");setMessage("");setEditingEvent(event);
    setForm({
      title:String(event.title||""),
      description:String(event.description||""),
      eventDate:normalizeCalendarDate(event.eventDate),
      startTime:String(event.startTime||""),
      endTime:String(event.endTime||""),
      type:String(event.type||"Agenda sekolah")
    });
    setShowAdd(true);
  };

  const removeEvent=async(event)=>{
    if(!window.confirm("Hapus agenda "+String(event.title||"")+"?")) return;
    setSaving(true);setError("");setMessage("");
    try{
      await api.deleteEvent(event.id);
      setMessage("Agenda sekolah berhasil dihapus.");
      await load();
    }catch(e){setError(e.message||String(e))}
    finally{setSaving(false)}
  };


  const todayKey=keyForDate(today);
  const futureSchoolEvents=events
    .filter(x=>String(x.eventDate||"").slice(0,10)>=todayKey)
    .slice()
    .sort((a,b)=>String(a.eventDate||"").slice(0,10).localeCompare(String(b.eventDate||"").slice(0,10))||String(a.startTime||"").localeCompare(String(b.startTime||"")));
  const upcomingSchoolGroups=[];
  const schoolDayNumber=date=>{const m=String(date||"").slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]))/86400000:NaN};
  futureSchoolEvents.forEach(event=>{
    const date=String(event.eventDate||"").slice(0,10), title=String(event.title||"Agenda sekolah").trim();
    const matchingGroups=upcomingSchoolGroups.filter(group=>group.title.trim().toLocaleLowerCase("id-ID")===title.toLocaleLowerCase("id-ID"));
    const lastMatching=matchingGroups[matchingGroups.length-1];
    if(lastMatching&&schoolDayNumber(date)-schoolDayNumber(lastMatching.events[lastMatching.events.length-1].eventDate)===1){
      lastMatching.events.push(event);
    }else{
      upcomingSchoolGroups.push({title,events:[event]});
    }
  });
  upcomingSchoolGroups.sort((a,b)=>String(a.events[0].eventDate||"").localeCompare(String(b.events[0].eventDate||""))||a.title.localeCompare(b.title,"id-ID"));
  const upcomingSchoolEvents=upcomingSchoolGroups.slice(0,4);
  const formatSchoolDateRange=group=>{
    const first=String(group.events[0].eventDate||"").slice(0,10), last=String(group.events[group.events.length-1].eventDate||"").slice(0,10);
    const fmt=date=>new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short"}).format(new Date(date+"T00:00:00"));
    return first===last?fmt(first):fmt(first)+" – "+fmt(last);
  };
  const upcomingCalendarItems=Object.entries(byDate)
    .flatMap(([date,items])=>items.map((item,index)=>({date,item,key:`${date}-${item.id||item.title||"event"}-${index}`})))
    .filter(x=>x.date>=todayKey&&x.item.kind!=="school")
    .sort((a,b)=>a.date.localeCompare(b.date)||String(a.item.startTime||"").localeCompare(String(b.item.startTime||"")));
  return <div className="content">
    <section className="page-title">
      <div><div className="eyebrow">Akademik</div><h1>Kalender Akademik</h1><p>Libur nasional, hari besar, dan agenda sekolah dalam satu kalender bersama.</p></div>
      <button className="primary" type="button" onClick={()=>openAddFor("")}><CirclePlus size={18}/> Tambah agenda</button>
    </section>
    {error&&<div className="card" style={{marginBottom:16}}><b>Gagal memproses kalender</b><p>{error}</p></div>}
    {message&&<div className="card" style={{marginBottom:16}}>{message}</div>}

    {loading?<InlineLoading text="Memuat kalender akademik..."/>:<>
      <section className="calendar-layout">
        <section className="card calendar-card">
          <div className="calendar-full">
            <div className="month-head">
              <button className="secondary" aria-label="Bulan sebelumnya" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button>
              <h2>{monthName}</h2>
              <button className="secondary" aria-label="Bulan berikutnya" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button>
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
                return <button type="button" className={"day calendar-day "+(date.getDay()===0?"sunday ":"")+(isToday?"today ":"")+(isSelected?"selected ":"")} key={k} onClick={()=>setSelectedDate(isSelected?"":k)} aria-pressed={isSelected}>
                  <b>{date.getDate()}</b>
                  <div className="day-items">
                    {items.slice(0,2).map((x,j)=><span key={x.id||j} className={"calendar-event "+x.kind} title={x.title}>{x.title}</span>)}
                    {items.length>2&&<span className="more-events">+{items.length-2} lainnya</span>}
                  </div>
                </button>
              })}
            </div>
          </div>
                <section className="card calendar-selected-details">
        <div className="card-head"><div><h2>{selectedDate?"Detail agenda · "+formatDate(selectedDate):"Detail agenda"}</h2><p>{selectedDate?"Agenda dan kegiatan pada tanggal yang kamu pilih.":"Pilih tanggal pada kalender untuk melihat detail agenda."}</p></div>{selectedDate&&<button className="secondary" type="button" onClick={()=>setSelectedDate("")}>Batal pilih</button>}</div>
        <div className="calendar-list">
          {selectedDate?(selectedItems.length?selectedItems.map((x,i)=><div className="calendar-detail-item selected-date-detail" key={x.id||String(x.title)+"-"+i}>
            <span className={"calendar-badge "+x.kind}>{x.kind==="holiday"?"Libur nasional":x.kind==="important"?"Hari besar":"Agenda sekolah"}</span>
            <div className="calendar-upcoming-copy"><b>{x.title}</b><small>{x.description||((x.startTime?formatTime(x.startTime):"")+(x.endTime?"–"+formatTime(x.endTime):""))||"Tanpa keterangan tambahan"}</small></div>
            {x.kind==="school"&&<div className="calendar-item-actions compact-actions selected-date-actions"><button className="secondary" type="button" onClick={()=>openEdit(x)} disabled={saving}>Edit</button><button className="secondary danger" type="button" onClick={()=>removeEvent(x)} disabled={saving}>Hapus</button></div>}
          </div>):<p className="calendar-empty-note">Tidak ada agenda pada tanggal ini.</p>):<p className="calendar-empty-note">Detail agenda akan ditampilkan di sini setelah kamu memilih tanggal.</p>}
        </div>
      </section>
        </section>

        <aside className="calendar-sidebar">
          <section className="card calendar-side-card">
            <div className="card-head"><div><h2>Agenda sekolah terdekat</h2><p>Agenda sekolah berikutnya berdasarkan tanggal.</p></div></div>
            <div className="calendar-list">
              {upcomingSchoolEvents.length?upcomingSchoolEvents.map((group,i)=>{
                const first=group.events[0], last=group.events[group.events.length-1];
                const timeLabel=(first.startTime?" · "+formatTime(first.startTime):"")+(first.endTime?"–"+formatTime(first.endTime):"");
                return <div className="calendar-detail-item upcoming-school-item" key={String(first.id||first.eventDate)+"-"+i}>
                  <div className="calendar-upcoming-date"><div className={"calendar-date-number "+(group.events.length>1?"calendar-date-fraction":"")}>{group.events.length>1?<><span>{String(first.eventDate||"").slice(8,10)}</span><i></i><span>{String(last.eventDate||"").slice(8,10)}</span></>:<span>{String(first.eventDate||"").slice(8,10)||"—"}</span>}</div><span>{String(first.eventDate||"").slice(5,7)?new Intl.DateTimeFormat("id-ID",{month:"short"}).format(new Date(String(first.eventDate).slice(0,10)+"T00:00:00")):""}</span></div>
                  <div className="calendar-upcoming-copy"><b>{group.title}</b><small>{formatSchoolDateRange(group)}{timeLabel}</small>{first.description&&<small>{first.description}</small>}</div>
                  
                </div>;
              }):<p className="calendar-empty-note">Belum ada agenda sekolah mendatang.</p>}
            </div>
          </section>

          <section className="card calendar-side-card">
            <div className="card-head"><div><h2>Hari besar &amp; libur nasional</h2><p>Hari besar dan libur nasional yang akan datang.</p></div></div>
            <div className="calendar-list">
              {upcomingCalendarItems.length?upcomingCalendarItems.slice(0,5).map(({date,item,key})=><div className="calendar-detail-item" key={key}>
                <div className="calendar-upcoming-date"><b>{date.slice(8,10)}</b><span>{new Intl.DateTimeFormat("id-ID",{month:"short"}).format(new Date(date+"T00:00:00"))}</span></div>
                <span className={"calendar-badge "+item.kind}>{item.kind==="holiday"?"Libur nasional":item.kind==="important"?"Hari besar":"Agenda sekolah"}</span>
                <div className="calendar-upcoming-copy"><b>{item.title}</b><small>{formatDate(date)}{item.startTime?" · "+formatTime(item.startTime):""}{item.endTime?"–"+formatTime(item.endTime):""}</small></div>
              </div>):<p className="calendar-empty-note">Belum ada agenda atau hari penting mendatang.</p>}
            </div>
          </section>
        </aside>

      </section>
    </>}
    {showAdd&&<div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head"><div><h2>{editingEvent?"Edit agenda sekolah":"Tambah agenda sekolah"}</h2><p>Agenda tersimpan di kalender bersama untuk semua guru.</p></div><button className="icon-btn" onClick={()=>{if(!saving)setShowAdd(false)}} disabled={saving}><X/></button></div>
        <label>Nama agenda<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Contoh: Sumatif Tengah Semester"/></label>
        <label>Deskripsi<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Keterangan agenda (opsional)"/></label>
        <label>Tanggal<input type="date" value={form.eventDate} onChange={e=>setForm({...form,eventDate:e.target.value})}/></label>
        <div className="two"><label>Mulai<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Selesai<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label></div>
        <label>Jenis agenda<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Agenda sekolah</option><option>Ujian / Asesmen</option><option>Rapat</option><option>Kegiatan sekolah</option><option>Lainnya</option></select></label>
        <div className="modal-actions"><button className="secondary" type="button" onClick={()=>setShowAdd(false)} disabled={saving}>Batal</button><button className="primary" type="button" disabled={saving||!form.title.trim()||!form.eventDate} onClick={save}>{saving?<><span className="button-spinner"></span>{editingEvent?"Menyimpan perubahan...":"Menyimpan agenda..."}</>:editingEvent?"Simpan perubahan":"Simpan agenda"}</button></div>
      </div>
    </div>}
  </div>
}

function DrivePage(){
  const [data,setData]=useState({configured:false,files:[],truncated:false});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [openFolders,setOpenFolders]=useState({});
  useEffect(()=>{
    api.getDriveMaterials()
      .then(setData)
      .catch(e=>setError(e.message||String(e)))
      .finally(()=>setLoading(false));
  },[]);
  const tree=useMemo(()=>{
    const root={name:"",path:"",folders:new Map(),files:[]};
    (data.files||[]).forEach(file=>{
      const parts=String(file.folderPath||"").split("/").map(part=>part.trim()).filter(Boolean);
      let node=root;
      const pathParts=[];
      parts.forEach(name=>{
        pathParts.push(name);
        const path=pathParts.join("/");
        if(!node.folders.has(name)) node.folders.set(name,{name,path,folders:new Map(),files:[]});
        node=node.folders.get(name);
      });
      node.files.push(file);
    });
    const sortNode=node=>{
      node.files.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),undefined,{numeric:true,sensitivity:"base"}));
      node.folders=new Map([...node.folders.entries()].sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true,sensitivity:"base"})));
      node.folders.forEach(sortNode);
    };
    sortNode(root);
    return root;
  },[data.files]);
  const toggleFolder=path=>setOpenFolders(current=>({...current,[path]:!current[path]}));
  const renderFiles=files=>files.map(file=><div className="event" key={file.id}>
    <div className="date-box"><FileText size={21}/></div>
    <div style={{minWidth:0,flex:1,overflowWrap:"anywhere"}}>
      <b>{file.name}</b>
      <span>{file.mimeType} · {Math.round((file.size||0)/1024)} KB</span>
    </div>
    <a className="text-btn" href={file.url} target="_blank" rel="noreferrer">Buka</a>
  </div>);
  const renderFolder=folder=>{
    const hasChildren=folder.folders.size>0||folder.files.length>0;
    const isOpen=!!openFolders[folder.path];
    return <div key={folder.path} style={{marginTop:4}}>
      <button type="button" onClick={()=>toggleFolder(folder.path)} aria-expanded={isOpen} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 8px",border:0,borderRadius:8,background:"transparent",color:"inherit",textAlign:"left",cursor:"pointer"}}>
        <ChevronDown size={17} style={{flexShrink:0,transform:isOpen?"rotate(0deg)":"rotate(-90deg)",transition:"transform .15s"}}/>
        {isOpen?<HardDrive size={19}/>:<HardDrive size={19}/>}
        <span style={{flex:1,minWidth:0,fontWeight:600,overflowWrap:"anywhere"}}>{folder.name}</span>
        <span style={{fontSize:12,opacity:.7,flexShrink:0}}>{countFiles(folder)} berkas</span>
      </button>
      {isOpen&&<div style={{marginLeft:18,paddingLeft:12,borderLeft:"1px solid var(--border, #e5e7eb)"}}>
        {[...folder.folders.values()].map(renderFolder)}
        {folder.files.length>0&&<div style={{marginLeft:4}}>{renderFiles(folder.files)}</div>}
      </div>}
    </div>;
  };
  const countFiles=node=>node.files.length+[...node.folders.values()].reduce((total,child)=>total+countFiles(child),0);
  return <div className="content">
    <section className="page-title">
      <div><div className="eyebrow">Google Drive</div><h1>Drive Materi</h1><p>Jelajahi materi berdasarkan susunan folder Google Drive sekolah.</p></div>
      {data.folderUrl&&<a className="primary" href={data.folderUrl} target="_blank" rel="noreferrer">Buka folder Drive</a>}
    </section>
    {error&&<div className="card" style={{marginBottom:16}}>{error}</div>}
    {loading?<InlineLoading text="Memuat data Drive materi..."/>:
      !data.configured?<section className="card"><p>Folder Drive belum dikonfigurasi.</p></section>:
      <section className="card">
        {data.truncated&&<div className="notice" role="status" style={{marginBottom:12}}>Daftar dibatasi agar pemuatan tetap cepat. Sebagian materi mungkin belum ditampilkan; buka folder Google Drive untuk melihat semua berkas.</div>}
        {[...tree.folders.values()].map(renderFolder)}
        {tree.files.length>0&&<div>{renderFiles(tree.files)}</div>}
        {data.files.length===0&&<p>Folder Drive masih kosong.</p>}
      </section>
    }
  </div>;
}
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

function SubstitutePage({user,onSubstitutionUpdated}){
 const today=localDateKey();
 const [form,setForm]=useState({date:today,startTime:"07:00",endTime:"08:20",className:"",topic:"",room:"",reason:""});
 const [candidates,setCandidates]=useState([]);
 const [selectedEmails,setSelectedEmails]=useState([]);
 const [plan,setPlan]=useState(null);
 const [requests,setRequests]=useState([]);
 const [history,setHistory]=useState([]);
 const [loading,setLoading]=useState(false);
 const [initialLoading,setInitialLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [retryingEmailId,setRetryingEmailId]=useState("");

 const retryEmail=async(id)=>{
   setRetryingEmailId(id);
   setMessage("");
   try{
     const result=await api.retrySubstitutionEmail(id);
     setMessage(result?.emailStatus==="Terkirim"?"Email notifikasi berhasil dikirim ulang.":"Pengiriman ulang gagal: "+(result?.emailError||"periksa konfigurasi email Apps Script."));
     await refresh();
   }catch(e){setMessage(e.message||String(e));}
   finally{setRetryingEmailId("");}
 };

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
       const list=Array.isArray(r?.candidates)?r.candidates:(Array.isArray(r)?r:[]);
       setCandidates(list);
       setSelectedEmails([]);
       setPlan(null);
       if(!list.length){
         setMessage("Tidak ada kandidat guru yang ditemukan untuk tanggal dan waktu tersebut.");
       }
     })
     .catch(e=>setMessage(e.message||String(e)))
     .finally(()=>setLoading(false));
 };

 const toggleCandidate=email=>setSelectedEmails(prev=>prev.includes(email)?prev.filter(x=>x!==email):[...prev,email]);
 const preparePlan=()=>{
   const selected=candidates.filter(x=>selectedEmails.includes(String(x.email||"").toLowerCase()));
   const coverage=buildCoveragePlan(selected,form.startTime,form.endTime);
   if(!coverage){setPlan(null);setMessage("Guru yang dipilih belum dapat menutup seluruh waktu. Pilih guru lain atau beberapa guru.");return;}
   setPlan(coverage);setMessage("");
 };
 
 const send=async()=>{
   if(!plan||!plan.length)return;
   setLoading(true);
   setMessage("");
   let savedCount=0;
   try{
     let emailFailures=0;
     for(const segment of plan){
       const saved=await api.saveSubstitution({
         ...form,
         startTime:segment.startTime,
         endTime:segment.endTime,
         substituteTeacherEmail:segment.email
       });
       savedCount++;
       if(saved?.emailStatus!=="Terkirim")emailFailures++;
     }
     const requestMessage=plan.length===1
       ? "Permintaan guru pengganti berhasil disimpan."
       : "Rencana pengganti terbagi menjadi "+plan.length+" permintaan dan berhasil disimpan.";
     setMessage(emailFailures
       ? requestMessage+" Namun, "+emailFailures+" email pemberitahuan gagal dikirim. Status tercatat; silakan hubungi guru yang dipilih secara langsung."
       : requestMessage+" Email pemberitahuan berhasil dikirim kepada guru yang dipilih."
     );
     setPlan(null);
     setCandidates([]);
     await refresh();
     await onSubstitutionUpdated?.();
   }catch(e){
     const detail=e.message||String(e);
     setMessage(savedCount>0
       ? "Baru "+savedCount+" dari "+plan.length+" permintaan berhasil disimpan sebelum terjadi kendala. Periksa riwayat permintaan sebelum mencoba lagi. Detail: "+detail
       : detail
     );
     if(savedCount>0){
       await refresh().catch(()=>{});
       await onSubstitutionUpdated?.();
     }
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
     await onSubstitutionUpdated?.();
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
     <div className="card-head"><div><h2>Pilih guru pengganti</h2><p>Pilih satu atau beberapa guru yang tersedia. Sistem akan memeriksa pilihan sebelum permintaan dikirim.</p></div></div>
     {candidates.map(x=>{const email=String(x.email||"").toLowerCase();const selected=selectedEmails.includes(email);return <div className={"todo-row substitution-candidate-row "+(selected?"selected":"")} key={x.email}>
       <button type="button" className={"candidate-select "+(selected?"selected":"")} onClick={()=>toggleCandidate(email)}>{selected?"✓ Terpilih":"Pilih"}</button>
       <div className="todo-copy"><b>{x.name||x.email}</b><span>{x.email}</span><small>{x.availableSegments?.length?x.availableSegments.map(s=>formatTime(s.startTime)+"–"+formatTime(s.endTime)).join(" · "):"Tidak tersedia"}{x.dailyLoad!=null?" · "+x.dailyLoad+" jadwal hari itu":""}</small></div>
       <span className={"priority "+(x.availableSegments?.length?"sedang":"tinggi")}>{x.status||"Tersedia"}</span>
     </div>})}
     <button className="primary" disabled={loading||selectedEmails.length===0} onClick={preparePlan}>{loading?"Memeriksa...":"Gunakan guru terpilih"}</button>
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
       <div className="todo-copy"><b>{x.className} · {formatDate(x.date)}</b><span>{formatTime(x.startTime)}–{formatTime(x.endTime)} · {x.substituteTeacherEmail||"Belum dipilih"}</span><small>{x.topic||"Tanpa materi"}{x.reason?" · "+x.reason:""}</small><small>Notifikasi email: {x.emailStatus||"Belum tercatat"}{x.emailStatus==="Gagal"&&x.emailError?" — "+x.emailError:""}</small>{(x.emailStatus==="Gagal"||!x.emailStatus)&&x.status==="Diajukan"&&<button className="secondary" style={{marginTop:8}} disabled={retryingEmailId===x.id} onClick={()=>retryEmail(x.id)}>{retryingEmailId===x.id?"Mengirim ulang…":"Kirim ulang notifikasi"}</button>}</div>
       <span className="priority sedang">{x.status}</span>
     </div>):<p>Belum ada pengajuan.</p>}
   </section>
   </>}
 </div>
}
function SchedulePage({user}){
  const [items,setItems]=useState([]);
  const [teachers,setTeachers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loaded,setLoaded]=useState(false);
  const [show,setShow]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [form,setForm]=useState({day:"Senin",startTime:"08:00",endTime:"08:40",className:"",topic:"",room:""});
  const [editing,setEditing]=useState(null);

  const days=["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const slots=["08:00-08:40","08:40-09:20","09:20-10:00","10:00-10:15","10:15-10:55","10:55-11:35","11:35-12:15","12:15-13:00","13:00-13:40","13:40-14:20","14:20-15:00","15:00-15:40","15:40-16:20","16:20-17:00"];
  const dayOrder=Object.fromEntries(days.map((d,i)=>[d,i]));

  const load=()=>{
    setLoading(true);setError("");
    return api.getBootstrap().then(d=>{
      setItems(d?.allSchedule||[]);
      setTeachers(d?.teachers||[]);
      setLoaded(true);
    }).catch(e=>setError(e.message||String(e))).finally(()=>setLoading(false));
  };
  useEffect(()=>{load()},[]);

  const teacherMap={};
  (teachers||[]).forEach(t=>{const email=String(t.email||"").toLowerCase();if(email)teacherMap[email]=t.name||email;});
  const teacherEmails=[...new Set((items||[]).map(x=>String(x.teacherEmail||"").trim().toLowerCase()).filter(Boolean))];
  const teacherList=(teachers||[]).filter(t=>String(t.email||"").trim()).slice().sort((a,b)=>String(a.name||a.email).localeCompare(String(b.name||b.email))).concat(
    teacherEmails.filter(email=>!(teachers||[]).some(t=>String(t.email||"").toLowerCase()===email)).map(email=>({email,name:email}))
  );

  const toMin=v=>{const m=String(v||"").match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):NaN;};
  const slotItems=(day,email,slot)=>{
    const [ss,ee]=slot.split("-");
    const start=toMin(ss),end=toMin(ee);
    return items.filter(x=>{
      if(String(x.day||"").trim().toLowerCase()!==day.toLowerCase()) return false;
      if(String(x.teacherEmail||"").trim().toLowerCase()!==String(email||"").trim().toLowerCase()) return false;
      const a=toMin(formatTime(x.startTime)),b=toMin(formatTime(x.endTime));
      return Number.isFinite(a)&&Number.isFinite(b)&&a<end&&b>start;
    }).sort((a,b)=>toMin(formatTime(a.startTime))-toMin(formatTime(b.startTime)));
  };

  const save=async()=>{
    if(!form.className.trim()){setError("Nama kelas wajib diisi.");return;}
    if(!form.startTime||!form.endTime){setError("Jam mulai dan selesai wajib diisi.");return;}
    if(form.startTime>=form.endTime){setError("Jam selesai harus lebih besar dari jam mulai.");return;}
    setSaving(true);setError("");
    try{
      const payload={...form,className:form.className.trim(),topic:form.topic.trim(),room:form.room.trim()};
      if(editing) await api.updateSchedule({...payload,id:editing.id}); else await api.saveSchedule(payload);
      const data=await api.getBootstrap();
      setItems(data?.allSchedule||[]);setTeachers(data?.teachers||[]);
      setShow(false);setEditing(null);
      setForm({day:"Senin",startTime:"08:00",endTime:"08:40",className:"",topic:"",room:""});
    }catch(e){setError(e.message||String(e));}
    finally{setSaving(false);}
  };

  const startEdit=s=>{
    if(String(s.teacherEmail||"").toLowerCase()!==String(user?.email||"").toLowerCase()) return;
    setEditing(s);
    setForm({day:s.day||"Senin",startTime:formatTime(s.startTime),endTime:formatTime(s.endTime),className:s.className||"",topic:s.topic||"",room:s.room||""});
    setShow(true);setError("");
  };

  const remove=async s=>{
    if(String(s.teacherEmail||"").toLowerCase()!==String(user?.email||"").toLowerCase()) return;
    if(!window.confirm("Hapus jadwal ini?")) return;
    setSaving(true);setError("");
    try{
      await api.deleteSchedule(s.id);
      const data=await api.getBootstrap();
      setItems(data?.allSchedule||[]);setTeachers(data?.teachers||[]);
    }catch(e){setError(e.message||String(e));}
    finally{setSaving(false);}
  };

  return <div className="content">
    <section className="page-title">
      <div><div className="eyebrow">Jadwal</div><h1>Jadwal Mengajar</h1><p>Jadwal ditampilkan per hari dengan kolom masing-masing guru matematika.</p></div>
      <button className="primary add-schedule-btn" type="button" title="Tambah jadwal mengajar" onClick={()=>{setEditing(null);setForm({day:"Senin",startTime:"08:00",endTime:"08:40",className:"",topic:"",room:""});setShow(true);setError("");}}><CirclePlus size={18}/> Tambah jadwal</button>
    </section>

    {loading?<InlineLoading text="Memuat data jadwal mengajar..."/>:
    error&&!loaded?<div className="card"><div className="card-head"><div><h2>Jadwal belum dapat dimuat</h2><p>Koneksi ke server Math Up sedang bermasalah.</p></div><button className="secondary" onClick={load}>Coba lagi</button></div><p>{error}</p></div>:
    <>{error&&<div className="card schedule-error">{error}</div>}
      {teacherList.length===0?<section className="card"><p style={{padding:20}}>Belum ada guru yang terdaftar.</p></section>:
      days.map(day=><section className="card daily-schedule-card" key={day}>
        <div className="card-head">
          <div><h2>Hari {day}</h2><p>{teacherList.length} guru · jadwal {day}</p></div>
        </div>
        <div className="teacher-schedule-scroll">
          <table className="teacher-schedule-table">
            <thead><tr><th className="time-col">Jam</th>{teacherList.map(t=><th key={t.email}>{t.name||t.email}</th>)}</tr></thead>
            <tbody>{slots.map(slot=><tr key={slot}>
              <th className="time-col">{slot}</th>
              {teacherList.map(t=>{
                const cellItems=slotItems(day,t.email,slot);
                return <td key={t.email}>
                  {cellItems.length?cellItems.map(s=><div className="teacher-schedule-item" key={s.id}>
                    <b>{s.className}</b><span>{s.topic||"Tanpa topik"}</span><small>{s.room||"-"} · {formatTime(s.startTime)}–{formatTime(s.endTime)}</small>
                    {String(s.teacherEmail||"").toLowerCase()===String(user?.email||"").toLowerCase()&&<div className="teacher-schedule-actions"><button type="button" className="secondary" onClick={()=>startEdit(s)} disabled={saving}>Edit</button><button type="button" className="secondary" onClick={()=>remove(s)} disabled={saving}>Hapus</button></div>}
                  </div>):<span className="teacher-schedule-empty">—</span>}
                </td>;
              })}
            </tr>)}</tbody>
          </table>
        </div>
      </section>)}
    </>}
    {show&&<div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><div><h2>{editing?"Edit jadwal":"Tambah jadwal"}</h2><p>Jadwal akan tersimpan ke Google Sheets.</p></div><button className="icon-btn" onClick={()=>{if(!saving){setShow(false);setEditing(null);}}} disabled={saving}><X/></button></div>
      <label>Hari<select value={form.day} onChange={e=>setForm({...form,day:e.target.value})}>{days.map(x=><option key={x}>{x}</option>)}</select></label>
      <div className="two"><label>Mulai<input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Selesai<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label></div>
      <label>Kelas<input value={form.className} onChange={e=>setForm({...form,className:e.target.value})} placeholder="VIII-A"/></label>
      <label>Materi / Topik<input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="Persamaan Linear"/></label>
      <label>Ruangan<input value={form.room} onChange={e=>setForm({...form,room:e.target.value})} placeholder="R. 201"/></label>
      {error&&<div className="schedule-modal-error" role="alert">{error}</div>}
      <div className="modal-actions"><button className="secondary" type="button" onClick={()=>{if(!saving){setShow(false);setEditing(null);}}} disabled={saving}>Batal</button><button className="primary" type="button" disabled={saving||!form.className.trim()} onClick={save}>{saving?<><span className="button-spinner"></span>{editing?"Menyimpan perubahan...":"Menyimpan jadwal..."}</>:editing?"Simpan perubahan":"Simpan jadwal"}</button></div>
    </div></div>}
  </div>
}

function PatchNotesPage(){
  const patches=[{
    version:"RMU 2.0",
    status:"Rilis saat ini",
    title:"Workspace guru terintegrasi",
    summary:"Ruang kerja digital untuk membantu guru mengelola jadwal, tugas, agenda, dan koordinasi guru pengganti.",
    groups:[
      {title:"Dashboard Guru",items:["Ringkasan jadwal mengajar, To-Do, agenda, dan informasi guru pengganti."]},
      {title:"Jadwal Mengajar",items:["Pengelolaan jadwal berdasarkan hari, jam, kelas, materi, dan ruangan.","Jadwal efektif dapat mengikuti pertukaran guru yang telah disetujui."]},
      {title:"Guru Pengganti",items:["Pencarian kandidat dengan mempertimbangkan bentrok jadwal dan agenda sekolah.","Alur pengajuan, respons, dan persetujuan penggantian guru.","Indikator notifikasi permintaan guru pengganti di aplikasi."]},
      {title:"To-Do dan Pengingat",items:["Membuat, mengedit, menghapus, dan menandai tugas selesai.","Pengaturan deadline dan prioritas tugas.","Pengingat deadline melalui teks berjalan, termasuk penanda untuk tugas prioritas tinggi."]},
      {title:"Kalender Akademik",items:["Tampilan kalender akademik, hari libur, cuti bersama, dan hari penting.","Pengelolaan agenda sekolah beserta tanggal dan waktu.","Detail agenda pada tanggal yang dipilih."]},
      {title:"Akun dan Navigasi",items:["Masuk menggunakan akun Google.","Sidebar navigasi dan tampilan yang menyesuaikan ukuran layar.","Akses cepat ke Gmail dan Google Drive.","Menu Guru Matematika untuk informasi/profil guru."]}
    ],
    note:"Drive Materi belum dicatat sebagai fitur aktif karena koneksinya belum dipastikan berfungsi."
  }];
  return <div className="content patch-page">
    <section className="page-title patch-page-title">
      <div><div className="eyebrow"><History size={14}/> Riwayat pembaruan</div><h1>Patch Note</h1><p>Catatan versi Ruang Math Up, dengan rilis terbaru ditampilkan terlebih dahulu.</p></div>
    </section>
    <div className="patch-timeline">
      {patches.map((patch,index)=><article className="card patch-card" key={patch.version}>
        <div className="patch-card-head">
          <div className="patch-version-icon"><History size={21}/></div>
          <div className="patch-version-copy"><div className="patch-version-line"><h2>{patch.version}</h2><span className="patch-current">{patch.status}</span></div><p>{patch.title}</p></div>
        </div>
        <p className="patch-summary">{patch.summary}</p>
        <div className="patch-groups">
          {patch.groups.map(group=><section className="patch-group" key={group.title}><h3>{group.title}</h3><ul>{group.items.map(item=><li key={item}>{item}</li>)}</ul></section>)}
        </div>
        <div className="patch-note"><strong>Catatan:</strong> {patch.note}</div>
      </article>)}
    </div>
  </div>;
}

function Placeholder({title}){return <div className="content"><section className="empty card"><div className="empty-icon"><CalendarDays size={28}/></div><h1>{title}</h1><p>Modul ini sudah disiapkan di Math Up dan akan kita sambungkan ke data Google Sheets/Drive pada tahap berikutnya.</p><button className="primary">Siapkan modul</button></section></div>}
function TodoModal({onClose,onSave,initial,saving}){const [title,setTitle]=useState(initial?.title||"");const [desc,setDesc]=useState(initial?.description||initial?.desc||"");const initialDue=String(initial?.dueAt||initial?.due||"");const [dueDate,setDueDate]=useState(initialDue.match(/^(\\d{4}-\\d{2}-\\d{2})/)?.[1]||"");const [dueTime,setDueTime]=useState(initialDue.match(/T(\\d{2}:\\d{2})/)?.[1]||"");const [priority,setPriority]=useState(initial?.priority||"Sedang");const save=()=>{const due=dueDate&&dueTime?dueDate+"T"+dueTime:"";onSave({title,desc,due,priority});};return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><h2>{initial?"Edit tugas":"Tugas baru"}</h2><p>Tambahkan pekerjaan yang perlu diselesaikan.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><label>Nama tugas<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Siapkan soal..." /></label><label>Deskripsi<textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Detail tugas..." /></label><div className="two"><label>Tanggal deadline<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label>Jam berakhir<input type="time" value={dueTime} onChange={e=>setDueTime(e.target.value)}/></label></div><label>Prioritas<select value={priority} onChange={e=>setPriority(e.target.value)}><option>Rendah</option><option>Sedang</option><option>Tinggi</option></select></label><div className="modal-actions"><button className="secondary" onClick={onClose}>Batal</button><button className="primary" disabled={!title.trim()||!dueDate||!dueTime||saving} onClick={save}>{saving?<><span className="button-spinner"></span>Menyimpan...</>:initial?"Simpan perubahan":"Simpan tugas"}</button></div></div></div>}

export default App;