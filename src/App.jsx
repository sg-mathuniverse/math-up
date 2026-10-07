import React, { useMemo, useState } from "react";
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
  const [todos,setTodos]=useState(initialTodos);
  const [menuOpen,setMenuOpen]=useState(false);
  const [showTodo,setShowTodo]=useState(false);
  const [query,setQuery]=useState("");

  const filteredTodos=useMemo(()=>todos.filter(t=>t.title.toLowerCase().includes(query.toLowerCase())),[todos,query]);

  const toggleTodo=id=>setTodos(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));

  return <div className="app">
    <aside className={menuOpen?"sidebar open":"sidebar"}>
      <div className="brand"><div className="brand-mark">∑</div><div><strong>Math Up</strong><span>Teacher Workspace</span></div></div>
      <nav>
        <Nav icon={<LayoutDashboard size={19}/>} label="Dashboard" active={active==="Dashboard"} onClick={()=>setActive("Dashboard")}/>
        <Nav icon={<CalendarDays size={19}/>} label="Jadwal Mengajar" active={active==="Jadwal Mengajar"} onClick={()=>setActive("Jadwal Mengajar")}/>
        <Nav icon={<ListTodo size={19}/>} label="To-Do" active={active==="To-Do"} onClick={()=>setActive("To-Do")}/>
        <Nav icon={<CalendarDays size={19}/>} label="Kalender Akademik" active={active==="Kalender Akademik"} onClick={()=>setActive("Kalender Akademik")}/>
        <Nav icon={<FileText size={19}/>} label="Drive Materi" active={active==="Drive Materi"} onClick={()=>setActive("Drive Materi")}/>
        <Nav icon={<Users size={19}/>} label="Guru Matematika" active={active==="Guru Matematika"} onClick={()=>setActive("Guru Matematika")}/>
      </nav>
      <div className="sidebar-bottom">
        <Nav icon={<Settings size={19}/>} label="Pengaturan" active={active==="Pengaturan"} onClick={()=>setActive("Pengaturan")}/>
        <div className="profile-mini"><div className="avatar">GM</div><div><b>Guru Matematika</b><span>Administrator</span></div><MoreHorizontal size={17}/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={()=>setMenuOpen(v=>!v)}><Menu size={20}/></button>
        <div className="crumb"><span>Workspace</span><b>/</b><strong>{active}</strong></div>
        <div className="top-actions">
          <div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari tugas..." /></div>
          <button className="icon-btn"><Bell size={19}/><i></i></button>
          <button className="user-chip"><div className="avatar small">GM</div><ChevronDown size={15}/></button>
        </div>
      </header>

      {active==="Dashboard" ? <Dashboard todos={filteredTodos} toggleTodo={toggleTodo} onAdd={()=>setShowTodo(true)} /> :
       active==="To-Do" ? <TodoPage todos={filteredTodos} toggleTodo={toggleTodo} onAdd={()=>setShowTodo(true)} /> :
       <Placeholder title={active} />}

      {showTodo && <TodoModal onClose={()=>setShowTodo(false)} onSave={t=>{setTodos(ts=>[...ts,{...t,id:Date.now(),done:false}]);setShowTodo(false)}}/>}
    </main>
  </div>
}

function Nav({icon,label,active,onClick}){return <button className={active?"nav active":"nav"} onClick={onClick}>{icon}<span>{label}</span>{label==="To-Do"&&<em>3</em>}</button>}

function Dashboard({todos,toggleTodo,onAdd}){
 return <div className="content">
  <section className="hero">
    <div><div className="eyebrow"><Sparkles size={14}/> Selamat datang kembali</div><h1>Selamat pagi, Guru! 👋</h1><p>Berikut ringkasan aktivitas matematika Anda hari ini.</p></div>
    <button className="primary" onClick={onAdd}><CirclePlus size={18}/> Tambah tugas</button>
  </section>
  <div className="stats">
    <Stat icon={<BookOpen/>} label="Jam mengajar hari ini" value="3" note="7:00 — 12:20"/>
    <Stat icon={<ListTodo/>} label="Tugas aktif" value={todos.filter(t=>!t.done).length} note="Perlu diselesaikan"/>
    <Stat icon={<CalendarDays/>} label="Agenda minggu ini" value="5" note="2 agenda sekolah"/>
  </div>
  <div className="grid">
    <section className="card schedule-card">
      <div className="card-head"><div><h2>Jadwal mengajar hari ini</h2><p>Rabu, 7 Oktober 2026</p></div><button className="text-btn">Lihat semua</button></div>
      <div className="schedule-list">{schedule.map((s,i)=><div className={i===0?"schedule-row current":"schedule-row"} key={s.time}><div className="time"><b>{s.time}</b><span>{s.end}</span></div><div className="line"><i></i></div><div className="lesson"><div><b>{s.className}</b><span>{s.topic}</span></div><small>{s.room}</small></div>{i===0&&<span className="now">Sekarang</span>}</div>)}</div>
    </section>
    <section className="card todo-card">
      <div className="card-head"><div><h2>To-Do terdekat</h2><p>Urut berdasarkan deadline & prioritas</p></div><button className="icon-btn"><MoreHorizontal size={18}/></button></div>
      <div className="todo-list">{todos.slice(0,4).map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)}/>)}</div>
      <button className="full-btn" onClick={onAdd}>+ Tambah tugas baru</button>
    </section>
  </div>
  <section className="card calendar-card"><div className="card-head"><div><h2>Agenda akademik</h2><p>Oktober 2026</p></div><button className="text-btn">Buka kalender</button></div><div className="events"><Event day="08" title="Rapat Tim Matematika" meta="13:00 · Ruang Guru"/><Event day="10" title="Batas pengumpulan kisi-kisi STS" meta="Semua guru matematika"/><Event day="12" title="STS Matematika" meta="Kelas VII–IX"/></div></section>
 </div>
}

function Stat({icon,label,value,note}){return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>}
function TodoRow({t,toggle}){return <div className={t.done?"todo-row done":"todo-row"}><button className="check" onClick={toggle}>{t.done&&<CheckCircle2 size={20}/>}</button><div className="todo-copy"><b>{t.title}</b><span>{t.desc}</span><small><Clock3 size={13}/>{t.due}</small></div><span className={"priority "+t.priority.toLowerCase()}>{t.priority}</span></div>}
function Event({day,title,meta}){return <div className="event"><div className="date-box"><b>{day}</b><span>OKT</span></div><div><b>{title}</b><span>{meta}</span></div></div>}
function TodoPage({todos,toggleTodo,onAdd}){return <div className="content"><section className="page-title"><div><div className="eyebrow">Produktivitas</div><h1>To-Do</h1><p>Kelola pekerjaan mengajar tanpa kehilangan deadline.</p></div><button className="primary" onClick={onAdd}><CirclePlus size={18}/> Tambah tugas</button></section><section className="card"><div className="todo-list large">{todos.map(t=><TodoRow key={t.id} t={t} toggle={()=>toggleTodo(t.id)}/>)}</div></section></div>}
function Placeholder({title}){return <div className="content"><section className="empty card"><div className="empty-icon"><CalendarDays size={28}/></div><h1>{title}</h1><p>Modul ini sudah disiapkan di Math Up dan akan kita sambungkan ke data Google Sheets/Drive pada tahap berikutnya.</p><button className="primary">Siapkan modul</button></section></div>}
function TodoModal({onClose,onSave}){const [title,setTitle]=useState("");const [desc,setDesc]=useState("");const [due,setDue]=useState("");const [priority,setPriority]=useState("Sedang");return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><h2>Tugas baru</h2><p>Tambahkan pekerjaan yang perlu diselesaikan.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><label>Nama tugas<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Siapkan soal..." /></label><label>Deskripsi<textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Detail tugas..." /></label><div className="two"><label>Deadline<input value={due} onChange={e=>setDue(e.target.value)} placeholder="8 Okt 2026, 16:00" /></label><label>Prioritas<select value={priority} onChange={e=>setPriority(e.target.value)}><option>Rendah</option><option>Sedang</option><option>Tinggi</option></select></label></div><div className="modal-actions"><button className="secondary" onClick={onClose}>Batal</button><button className="primary" disabled={!title.trim()} onClick={()=>onSave({title,desc,due:due||"Belum ditentukan",priority})}>Simpan tugas</button></div></div></div>}

export default App;