import React,{useEffect,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import{createClient}from'@supabase/supabase-js';
import Tesseract from'tesseract.js';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';
import * as XLSX from'xlsx';
import'./styles.css';

const supabase=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY);

const tc=s=>(s||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR').split(' ').filter(Boolean).map(w=>w[0]?.toLocaleUpperCase('tr-TR')+w.slice(1)).join(' ');
const dt=v=>v?new Date(v).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'}):'-';
const days=v=>Math.max(0,Math.floor((Date.now()-new Date(v))/(864e5)));
function tone(t='save'){try{let c=new(window.AudioContext||window.webkitAudioContext),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=t==='deliver'?880:660;g.gain.setValueAtTime(.001,c.currentTime);g.gain.exponentialRampToValueAtTime(.25,c.currentTime+.02);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.18);o.start();o.stop(c.currentTime+.2)}catch{}}

const words={
 tr:{home:'Ana Sayfa',new:'Yeni Kargo Ekle',check:'Kontrol Et',active:'Aktif Kargolar',due:'Zamanı Geçen Kargolar',delivered:'Teslim Edilenler',settings:'Ayarlar',stats:'İstatistikler',summary:'Depo Özeti',login:'Giriş Yap',email:'Kullanıcı Adı / E-posta',pass:'Şifre',remember:'Beni Hatırla',forgot:'Şifremi Unuttum',logout:'Çıkış',refresh:'Verileri Yenile',lang:'Dil',theme:'Görünüm',about:'Hakkında',light:'Açık Tema',dark:'Koyu Tema'},
 de:{home:'Startseite',new:'Paket hinzufügen',check:'Paket prüfen',active:'Aktive Pakete',due:'Überfällige Pakete',delivered:'Zugestellte Pakete',settings:'Einstellungen',stats:'Statistiken',summary:'Lagerübersicht',login:'Anmelden',email:'Benutzer / E-Mail',pass:'Passwort',remember:'Angemeldet bleiben',forgot:'Passwort vergessen',logout:'Abmelden',refresh:'Daten aktualisieren',lang:'Sprache',theme:'Design',about:'Info',light:'Helles Design',dark:'Dunkles Design'}
};

function App(){
 const[session,setSession]=useState(null),[profile,setProfile]=useState(null),[wh,setWh]=useState(null),[warehouses,setWarehouses]=useState([]),[cargos,setCargos]=useState([]),[archive,setArchive]=useState([]),[logs,setLogs]=useState([]),[tab,setTab]=useState('home'),[loading,setLoading]=useState(true),[splash,setSplash]=useState(false),[msg,setMsg]=useState('');
 const[lang,setLang]=useState(localStorage.getItem('gls_lang')||'tr'),[theme,setTheme]=useState(localStorage.getItem('gls_theme')||'light');
 const t=words[lang]||words.tr;

 useEffect(()=>{document.body.className=theme==='dark'?'dark':'';localStorage.setItem('gls_theme',theme)},[theme]);
 useEffect(()=>{localStorage.setItem('gls_lang',lang)},[lang]);

 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);if(data.session)loadProfile()});supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s)loadProfile();else{setProfile(null);setWh(null);setCargos([]);setArchive([]);setLogs([])}})},[]);

 async function loadProfile(){
  const{data:u}=await supabase.auth.getUser();
  if(!u.user)return;
  const{data:p,error}=await supabase.from('profiles').select('*').eq('id',u.user.id).single();
  if(error){setMsg(error.message);return}
  setProfile(p);setSplash(true);setTimeout(()=>setSplash(false),p.role==='admin'?2000:4500);
  if(p.role==='admin'){const{data}=await supabase.from('warehouses').select('*').order('created_at');setWarehouses(data||[])}
  else{const{data:w}=await supabase.from('warehouses').select('*').eq('id',p.warehouse_id).single();setWh(w);loadData(w.id)}
 }

 async function loadData(id=wh?.id){
  if(!id)return;
  let a=await supabase.from('cargos').select('*').eq('warehouse_id',id).order('created_at',{ascending:false});
  let b=await supabase.from('delivery_archive').select('*,warehouses(name)').eq('warehouse_id',id).order('delivered_at',{ascending:false}).limit(1000);
  let l=await supabase.from('activity_logs').select('*').eq('warehouse_id',id).order('created_at',{ascending:false}).limit(20);
  setCargos(a.data||[]);setArchive(b.data||[]);setLogs(l.data||[]);
  setMsg('Son senkronizasyon: '+new Date().toLocaleString('tr-TR'));
 }

 if(loading)return <div className="center">Yükleniyor...</div>;
 if(!session)return <Login t={t} msg={msg}/>;
 if(splash)return <Splash profile={profile} wh={wh}/>;
 if(profile?.role==='admin'&&!wh)return <Admin warehouses={warehouses} setWh={(w)=>{setWh(w);loadData(w.id)}} loadProfile={loadProfile}/>;

 const active=cargos.filter(c=>c.status==='active'),delivered=cargos.filter(c=>c.status==='delivered'&&c.visible_in_delivered);
 const ctx={profile,wh,cargos,setCargos,archive,logs,active,delivered,loadData,msg,setMsg,lang,setLang,theme,setTheme,t,setTab};

 return <div className="app">
  <header className="appHeader"><div><h1>GLS Kargo Takip</h1><p>{profile?.role==='admin'?'Admin':wh?.name}</p></div><div className="headerActions"><button className="homeTopBtn" onClick={()=>setTab('home')}>🏠 Ana Sayfa</button><button onClick={()=>supabase.auth.signOut()}>{t.logout}</button></div></header>
  {msg&&<div className="sync">{msg}</div>}
  <main>
   {tab==='home'&&<Home c={ctx} setTab={setTab}/>}
   {tab==='new'&&<NewCargo c={ctx}/>}
   {tab==='check'&&<Check c={ctx}/>}
   {tab==='active'&&<Active c={ctx}/>}
   {tab==='due'&&<Due c={ctx}/>}
   {tab==='delivered'&&<Delivered c={ctx}/>}
   {tab==='stats'&&<Stats c={ctx}/>}
   {tab==='settings'&&<Settings c={ctx}/>}
  </main>
 </div>
}

function Login({t,msg}){
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[remember,setRemember]=useState(localStorage.getItem('remember_login')==='1'),[err,setErr]=useState('');
 async function go(e){e.preventDefault();setErr('');let{error}=await supabase.auth.signInWithPassword({email,password});if(error)setErr(error.message);else localStorage.setItem('remember_login',remember?'1':'0')}
 return <div className="login"><form onSubmit={go} className="loginCard">
  <div className="loginIcon">📦</div><h1>GLS Kargo Takip</h1>
  <label>{t.email}</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@glstakip.local" autoCapitalize="none"/>
  <label>{t.pass}</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••"/>
  <label className="check"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> {t.remember}</label>
  {err&&<p className="err">{err}</p>}{msg&&<p className="sync">{msg}</p>}
  <button className="primary">{t.login}</button>
  <button type="button" className="link" onClick={()=>{setPassword('123456');setErr('Şifre alanı 123456 yapıldı.')}}>{t.forgot}</button>
 </form></div>
}

function Splash({profile,wh}){let meet=wh?.name?.toLowerCase().includes('meet');return <div className={'splash '+(meet?'meet':'')}>{meet?<img src="/meet-kiosk-logo.jpeg"/>:<h1>{profile?.role==='admin'?'Admin Panel':wh?.name}</h1>}<h2>GLS Kargo Takip</h2><p>Powered by<br/>Uğur Özbey</p></div>}

function Home({c,setTab}){
 const risk=c.active.filter(x=>days(x.created_at)>=5).length,warn=c.active.filter(x=>days(x.created_at)===4).length,pct=Math.round(c.active.length/2);
 const menu=[
  ['home','🏠',c.t.home],
  ['new','📦',c.t.new],
  ['check','🔍',c.t.check],
  ['active','📋',c.t.active],
  ['due','⏰',c.t.due],
  ['delivered','✅',c.t.delivered],
  ['settings','⚙️',c.t.settings],
  ['stats','📊',c.t.stats]
 ];
 return <section>
  <div className="homeMenu">
   {menu.map(m=><button key={m[0]} onClick={()=>setTab(m[0])} className={m[0]==='due'&&risk>0?'dangerMenu':''}><span>{m[1]}</span><b>{m[2]}</b>{m[0]==='active'&&<small>{c.active.length}</small>}{m[0]==='delivered'&&<small>{c.archive.length}</small>}{m[0]==='due'&&<small>{risk}</small>}</button>)}
  </div>
  <div className="summarySpacer"></div>
  <h2 className="sectionTitle">📊 {c.t.summary}</h2>
  <div className="statsGrid">
   <button onClick={()=>setTab('active')} className="stat blue">📦 Aktif<b>{c.active.length}</b></button>
   <button onClick={()=>setTab('delivered')} className="stat green">✅ Teslim<b>{c.archive.length}</b></button>
   <div className="stat navy">🏬 Doluluk<b>{c.active.length}/200</b><small>%{pct}</small></div>
   <div className="stat light">🟢 Boş<b>{200-c.active.length}</b></div>
   <button onClick={()=>setTab('due')} className="stat red">🔴 İade Riski<b>{risk}</b></button>
   <button onClick={()=>setTab('due')} className="stat yellow">🟡 4 Günlük<b>{warn}</b></button>
  </div>
 </section>
}

function NewCargo({c}){
 const video=useRef(),canvas=useRef();
 const[name,setName]=useState(''),[large,setLarge]=useState(false),[reading,setReading]=useState(false),[cam,setCam]=useState(false),[previewSlot,setPreviewSlot]=useState(null),[cameraErr,setCameraErr]=useState('');

 useEffect(()=>{loadNextSlot()},[c.wh?.id,c.active.length]);

 async function loadNextSlot(){if(!c.wh?.id)return;let{data,error}=await supabase.rpc('next_free_slot',{p_warehouse_id:c.wh.id});if(!error)setPreviewSlot(data)}
 async function start(){setCameraErr('');try{let s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});video.current.srcObject=s;setCam(true)}catch(e){setCameraErr('Kamera açılamadı. iPhone’da HTTPS bağlantısı gerekebilir.')}}
 async function read(){
 setReading(true);
 try{
  let v=video.current,cn=canvas.current,w=v.videoWidth,h=v.videoHeight;

  if(!v||!w||!h){
   c.setMsg('Kamera görüntüsü alınamadı. Lütfen kamerayı tekrar açın.');
   return;
  }

  let cropX = Math.floor(w * 0.05);
let cropY = Math.floor(h * 0.38);
let cropW = Math.floor(w * 0.90);
let cropH = Math.floor(h * 0.28);

cn.width = cropW;
cn.height = cropH;

let ctx = cn.getContext('2d');
ctx.drawImage(v, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  let r=await Tesseract.recognize(cn,'tur+deu+eng');
  let rawText=r.data.text||'';

  function normalizeLine(x){
   return (x||'')
    .replace(/\|/g,'I')
    .replace(/Shop\s*Delivery\s*Service/gi,'ShopDeliveryService')
    .replace(/ShopDeliveryServıce/gi,'ShopDeliveryService')
    .replace(/ShopDelıveryService/gi,'ShopDeliveryService')
    .replace(/\s+/g,' ')
    .trim();
  }

  let lines=rawText
   .split(/\r?\n/)
   .map(normalizeLine)
   .filter(Boolean);

  let shopIndex=lines.findIndex(line=>{
   let clean=line.replace(/\s+/g,'').toLowerCase();
   return clean.includes('shopdeliveryservice') ||
          clean.includes('shopdelıveryservice') ||
          clean.includes('shopdeliveryservıce') ||
          clean.includes('shopdeliveryservlce');
  });

  if(shopIndex===-1){
   setName('');
   c.setMsg('ShopDeliveryService bulunamadı. Lütfen tüm etiketi kameraya tam olarak alın.');
   return;
  }

  let nameLine='';
  let sameLine=lines[shopIndex]||'';
  let sameMatch=sameLine.match(/c\s*\/\s*o\s+(.+)/i);

  if(sameMatch&&sameMatch[1]){
   nameLine=sameMatch[1];
  }else{
   for(let i=shopIndex+1;i<Math.min(lines.length,shopIndex+5);i++){
    let candidate=lines[i]||'';
    if(/^(myflexbox|industriestra|strasse|straße|at\s*-|de\s*-|[0-9]{4,}|shopdeliveryservice)/i.test(candidate))continue;
    nameLine=candidate;
    break;
   }
  }

  nameLine=nameLine
   .replace(/^c\s*\/\s*o\s*/i,'')
   .replace(/^c\s*o\s*/i,'')
   .replace(/^cio\s*/i,'')
   .replace(/^c0\s*/i,'')
   .replace(/[^A-Za-zÀ-ž\s.'-]/g,'')
   .replace(/\s+/g,' ')
   .trim();

  if(!nameLine||nameLine.length<3){
   setName('');
   c.setMsg('İsim satırı okunamadı. ShopDeliveryService altındaki c/o isim kısmı net görünmeli.');
   return;
  }

  let finalName=tc(nameLine);
  setName(finalName);
  c.setMsg('İsim okundu: '+finalName);

 }catch(e){
  c.setMsg('Okuma hatası: '+e.message);
 }finally{
  setReading(false);
 }
}
 async function save(){
  let clean=tc(name);if(!clean)return c.setMsg('İsim boş olamaz');
  let dup=c.active.find(x=>x.recipient_name.toLocaleLowerCase('tr-TR')===clean.toLocaleLowerCase('tr-TR'));if(dup&&!confirm(`Bu isimde aktif kargo var.\nNo: ${dup.slot_no}\nYine de kaydet?`))return;
  let slot=previewSlot;if(!slot){let{data,error}=await supabase.rpc('next_free_slot',{p_warehouse_id:c.wh.id});if(error)return c.setMsg(error.message);slot=data}
  let{error:e2}=await supabase.from('cargos').insert({warehouse_id:c.wh.id,recipient_name:clean,slot_no:slot,is_large:large,created_by:c.profile.id});
  if(e2)return c.setMsg(e2.message);
  await supabase.from('activity_logs').insert({warehouse_id:c.wh.id,user_id:c.profile.id,action:'created',description:clean+' eklendi - Numara: '+slot});
  tone('save');c.setMsg('Kargo kaydedildi. Numara: '+slot);setName('');setLarge(false);await c.loadData();await loadNextSlot()
 }

 return <div className="panel"><h2>📦 Yeni Kargo Ekle</h2>
  <div className="cam"><video ref={video} autoPlay playsInline muted/>{!cam&&<button onClick={start}>📷 Kamerayı Aç</button>}<div className="box"><span>İSMİ BU KUTUYA AL</span></div></div>
  {cameraErr&&<p className="err">{cameraErr}</p>}
  <canvas ref={canvas} hidden/>
  <button className="primary" onClick={read} disabled={!cam||reading}>{reading?'Okunuyor...':'📸 Burayı Oku'}</button>
  <b>İsmi sarı kutuya alıp Burayı Oku’ya bas.</b>
  <label>Okunan / Düzeltilen İsim</label><input value={name} onChange={e=>setName(tc(e.target.value))} placeholder="İsim soyisim"/>
  <label className="big"><input type="checkbox" checked={large} onChange={e=>setLarge(e.target.checked)}/> 📦 Büyük Kargo</label>
  <div className="slotBig slotBeforeSave"><small>📦 VERİLECEK NUMARA</small><strong>{previewSlot||'-'}</strong></div>
  <button className="success" onClick={save}>✅ Kaydet</button>
 </div>
}

function Check({c}){const[q,setQ]=useState('');let f=q.trim().length<2?[]:c.active.filter(x=>x.recipient_name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR'))||String(x.slot_no).startsWith(q));async function del(x){if(!confirm(`${x.recipient_name}\nNo: ${x.slot_no}\nTeslim edildi yapılsın mı?`))return;let{error}=await supabase.rpc('deliver_cargo',{p_cargo_id:x.id});if(error)alert(error.message);else{tone('deliver');setQ('');c.loadData()}}return <div className="panel"><h2>🔍 Kontrol Et</h2><input value={q} onChange={e=>setQ(e.target.value)} placeholder="İlk iki harf veya numara"/>{f.map(x=><div className="item" key={x.id}><b>{x.slot_no} - {x.recipient_name}</b><span>{x.is_large?'📦 Büyük • ':''}{days(x.created_at)} Gün</span><button onClick={()=>del(x)}>Teslim Et</button></div>)}</div>}

function Active({c}){const[q,setQ]=useState(''),[big,setBig]=useState(false),[selected,setSelected]=useState(null);let arr=c.active.filter(x=>(!big||x.is_large)&&(!q||x.recipient_name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR'))||String(x.slot_no).includes(q))).sort((a,b)=>a.slot_no-b.slot_no);async function del(x){let{error}=await supabase.rpc('deliver_cargo',{p_cargo_id:x.id});if(error)alert(error.message);else{tone('deliver');setSelected(null);c.loadData()}}return <div className="panel"><h2>📋 Aktif Kargolar</h2><input value={q} onChange={e=>setQ(e.target.value)} placeholder="İsim veya numara"/><label className="check"><input type="checkbox" checked={big} onChange={e=>setBig(e.target.checked)}/> Sadece Büyük Kargolar</label>{arr.map((x,i)=><button key={x.id} onClick={()=>setSelected(x)} className={'activeCargoCard color'+(i%4)+' '+(days(x.created_at)>=5?'dangerCard':days(x.created_at)===4?'warnCard':'')}><div className="cargoNo">{x.slot_no}</div><div className="cargoInfo"><b>{x.recipient_name}</b><span>{x.is_large?'📦 Büyük Kargo':'Normal Kargo'} • {days(x.created_at)} Gün</span><small>{dt(x.created_at)}</small></div></button>)}{selected&&<div className="modalShade" onClick={()=>setSelected(null)}><div className="deliverSheet" onClick={e=>e.stopPropagation()}><h2>📦 {selected.slot_no}</h2><h3>{selected.recipient_name}</h3><p>{selected.is_large?'📦 Büyük Kargo':'Normal Kargo'} • {days(selected.created_at)} Gün</p><button className="success" onClick={()=>del(selected)}>✅ Teslim Et</button><button className="cancelBtn" onClick={()=>setSelected(null)}>❌ İptal</button></div></div>}</div>}

function Due({c}){return <div className="panel"><h2>⏰ Zamanı Geçen Kargolar</h2>{c.active.sort((a,b)=>days(b.created_at)-days(a.created_at)).map(x=><div className={'cargo '+(days(x.created_at)>=5?'danger':days(x.created_at)===4?'warn':'ok')} key={x.id}><b>{days(x.created_at)>=5?'🔴':days(x.created_at)===4?'🟡':'🟢'} {x.slot_no} - {x.recipient_name}</b><p>Bekleme: {days(x.created_at)} Gün {days(x.created_at)>=5?'• İade Kontrol':''}</p></div>)}</div>}

function Delivered({c}){let arr=c.delivered.sort((a,b)=>new Date(b.delivered_at)-new Date(a.delivered_at));async function clear(){if(confirm('Görünür teslim geçmişi temizlensin mi? Ana arşiv silinmez.')){await supabase.from('cargos').update({visible_in_delivered:false}).eq('warehouse_id',c.wh.id).eq('status','delivered');c.loadData()}}return <div className="panel"><h2>✅ Teslim Edilenler</h2><button className="dangerBtn" onClick={clear}>Geçmişi Temizle</button>{arr.map(x=><details key={x.id} className="cargo"><summary><b>{x.slot_no} - {x.recipient_name}</b> <span>{dt(x.delivered_at)}</span></summary><p>Kayıt: {dt(x.created_at)}</p><p>Teslim: {dt(x.delivered_at)}</p><p>Büyük Kargo: {x.is_large?'Evet':'Hayır'}</p></details>)}</div>}

function Stats({c}){const[from,setFrom]=useState(new Date().toISOString().slice(0,10)),[to,setTo]=useState(new Date().toISOString().slice(0,10)),[rows,setRows]=useState([]);async function get(){let{data}=await supabase.from('delivery_archive').select('*,warehouses(name)').eq('warehouse_id',c.wh.id).gte('delivered_at',from+'T00:00:00').lte('delivered_at',to+'T23:59:59').order('delivered_at',{ascending:false});setRows(data||[])}function excel(){let ws=XLSX.utils.json_to_sheet(rows.map(r=>({'No':r.slot_no,'Ad Soyad':r.recipient_name,'Depo':r.warehouses?.name,'Büyük':r.is_large?'Evet':'Hayır','Kayıt':dt(r.created_at),'Teslim':dt(r.delivered_at)})));let wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Teslimler');XLSX.writeFile(wb,'GLS_Rapor.xlsx')}function pdf(){let doc=new jsPDF();doc.text('GLS Kargo Takip - Teslim Raporu',14,18);autoTable(doc,{startY:28,head:[['No','Ad Soyad','Depo','Büyük','Kayıt','Teslim']],body:rows.map(r=>[r.slot_no,r.recipient_name,r.warehouses?.name,r.is_large?'Evet':'Hayır',dt(r.created_at),dt(r.delivered_at)])});doc.save('GLS_Rapor.pdf')}return <div className="panel"><h2>📊 İstatistikler</h2><p>Aktif: <b>{c.active.length}</b> Teslim Arşivi: <b>{c.archive.length}</b></p><label>Başlangıç</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/><label>Bitiş</label><input type="date" value={to} onChange={e=>setTo(e.target.value)}/><button className="primary" onClick={get}>Göster</button><h3>Toplam Teslim: {rows.length}</h3><button onClick={pdf}>PDF Oluştur</button><button onClick={excel}>Excel Oluştur</button></div>}

function Settings({c}){return <div className="panel"><h2>⚙️ {c.t.settings}</h2>
 <section className="settingBlock"><h3>🌍 {c.t.lang}</h3><div className="settingBtns"><button className={c.lang==='tr'?'selected':''} onClick={()=>c.setLang('tr')}>Türkçe</button><button className={c.lang==='de'?'selected':''} onClick={()=>c.setLang('de')}>Deutsch</button></div></section>
 <section className="settingBlock"><h3>🎨 {c.t.theme}</h3><div className="settingBtns"><button className={c.theme==='light'?'selected':''} onClick={()=>c.setTheme('light')}>{c.t.light}</button><button className={c.theme==='dark'?'selected':''} onClick={()=>c.setTheme('dark')}>{c.t.dark}</button></div></section>
 <section className="settingBlock"><h3>☁️ Veri</h3><button className="primary" onClick={()=>c.loadData()}>{c.t.refresh}</button><p>{c.msg}</p></section>
 <section className="settingBlock about"><h3>ℹ️ {c.t.about}</h3><p><b>GLS Kargo Takip</b></p><p><b>Sürüm:</b><br/>1.0.0</p><p><b>Build:</b><br/>1.0.0</p><p><b>Yayın Tarihi:</b><br/>2026</p><p><b>Platform:</b><br/>PWA (Progressive Web App)</p><hr/><p><b>Uygulama Sahibi</b><br/>Uğur Özbey</p><hr/><p><b>Veritabanı:</b><br/>Supabase Cloud</p><p><b>Son Senkronizasyon:</b><br/>{c.msg||'Otomatik Güncellenir'}</p><p><b>Uygulama Kimliği:</b><br/>GLS-KT-2026</p><hr/><p><b>Destek</b><br/>Şifre sıfırlama ve teknik destek:<br/>uozbey15@gmail.com</p><hr/><p>© 2026 Uğur Özbey<br/>Tüm hakları saklıdır.</p></section>
 </div>}

function Admin({warehouses,setWh,loadProfile}){const[name,setName]=useState(''),[username,setUsername]=useState(''),[cap,setCap]=useState(200),[msg,setMsg]=useState('');async function add(){let{error}=await supabase.from('warehouses').insert({name,username,capacity:+cap||200});if(error)setMsg(error.message);else{setMsg('Depo oluşturuldu. Kullanıcıyı Supabase Auth üzerinden açıp profiles tablosuna bağlayın.');setName('');setUsername('');loadProfile()}}return <div className="app"><header className="appHeader"><h1>GLS Kargo Takip</h1><button onClick={()=>supabase.auth.signOut()}>Çıkış</button></header><main><div className="panel"><h2>🛠 Admin Panel</h2>{warehouses.map(w=><button className="wh" onClick={()=>setWh(w)} key={w.id}>{w.name}<small>{w.capacity} kapasite</small></button>)}<h3>➕ Yeni Depo Oluştur</h3><input value={name} onChange={e=>setName(e.target.value)} placeholder="Depo Adı"/><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Kullanıcı Adı"/><input value={cap} onChange={e=>setCap(e.target.value)} type="number"/><button className="primary" onClick={add}>Depo Oluştur</button>{msg&&<p className="sync">{msg}</p>}</div></main></div>}

createRoot(document.getElementById('root')).render(<App/>);
