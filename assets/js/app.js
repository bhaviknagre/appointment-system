/* Meridian Hospital appointment booking: app logic (vanilla JS, no build step) */
(function(){
const CFG=Object.assign({hospitalName:'Meridian Hospital',hospitalWhatsApp:'919000000000',slotMinutes:15,lunchStart:'13:00',lunchEnd:'14:00',bookingWindowDays:14,departments:['General Medicine','Cardiology','Orthopedics','Pediatrics','Dermatology','ENT'],demoDoctorPassword:'Clinic@2026'},window.APP_CONFIG||{});
const HOSPITAL=CFG.hospitalName;
document.title=HOSPITAL+' appointments';
const DEPTS=CFG.departments;
const DAYN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const STATUS={booked:'Booked',completed:'Completed',cancelled:'Cancelled','no-show':'Missed'};
const KEY='meridian-hospital-demo-v2';
const SKEY='meridian-hospital-session-v2';
const SLOT=CFG.slotMinutes;
const DAYS_AHEAD=CFG.bookingWindowDays;
const $app=document.getElementById('app');

/* ---------- helpers ---------- */
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseKey=k=>{const[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const today=()=>dkey(new Date());
const fmtDate=(k,long)=>parseKey(k).toLocaleDateString('en-GB',long?{weekday:'long',day:'numeric',month:'long'}:{weekday:'short',day:'numeric',month:'short'});
const fmtTime=t=>{const[h,m]=t.split(':').map(Number);return `${h%12||12}:${pad(m)} ${h>=12?'PM':'AM'}`};
const fmtHour=h=>`${h%12||12} ${h>=12?'PM':'AM'}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=n=>n.replace(/^Dr\.?\s*/i,'').split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const digits=s=>String(s||'').replace(/\D/g,'');
const fmtPhone=p=>{p=digits(p);return p.length===10?p.slice(0,5)+' '+p.slice(5):p};
const cssEsc=s=>(window.CSS&&CSS.escape)?CSS.escape(s):String(s).replace(/["\\]/g,"\\$&");
const toMin=t=>{const[h,m]=t.split(':').map(Number);return h*60+m};
function daysLabel(days){
  const s=[...days].sort((a,b)=>a-b);
  const run=s.length>2&&s.every((d,i)=>i===0||d===s[i-1]+1);
  return run?`${DAYN[s[0]]} to ${DAYN[s[s.length-1]]}`:s.map(d=>DAYN[d]).join(', ');
}
function slotsFor(doc,k){
  if(!doc||!doc.available)return[];
  if(!doc.days.includes(parseKey(k).getDay()))return[];
  const out=[];
  for(let m=doc.start*60;m<doc.end*60;m+=SLOT){
    if(m>=toMin(CFG.lunchStart)&&m<toMin(CFG.lunchEnd))continue; // lunch break
    out.push(pad(Math.floor(m/60))+':'+pad(m%60));
  }
  return out;
}
function isPast(k,t){const d=parseKey(k);const[h,m]=t.split(':').map(Number);d.setHours(h,m,0,0);return d<new Date()}

/* ---------- data ---------- */
const emailFor=n=>n.replace(/^Dr\.?\s*/i,'').toLowerCase().replace(/[^a-z\s]/g,'').trim().replace(/\s+/g,'.')+'@meridianhospital.in';
// Hospital's WhatsApp number (country code + number, no + or spaces). Replace with your real number.
const HOSPITAL_WA=String(CFG.hospitalWhatsApp).replace(/\D/g,'');
const waLink=(num,text)=>`https://wa.me/${num}?text=${encodeURIComponent(text)}`;
function openWA(num,text){try{window.open(waLink(num,text),'_blank','noopener')}catch(e){}}
function waText(a,doc,kind){
  const when=`${fmtDate(a.date,true)}, ${fmtTime(a.time)}`;
  if(kind==='hospital-cancel')return `Hello ${a.patient.split(' ')[0]}, your appointment ${a.id} with ${doc.name} on ${when} at ${HOSPITAL} has been cancelled.

Please book a new time from the patient portal or reply here and we'll help you.`;
  if(kind==='cancellation')return `Hi ${HOSPITAL}, I've cancelled my appointment.

Ref: ${a.id}
Patient: ${a.patient}
Doctor: ${doc.name} (${doc.dept})
Was on: ${when}`;
  return `Hi ${HOSPITAL}, I've booked an appointment.

Ref: ${a.id}
Patient: ${a.patient}
Mobile: ${fmtPhone(a.phone)}
Doctor: ${doc.name} (${doc.dept})
Date: ${fmtDate(a.date,true)}
Time: ${fmtTime(a.time)} (${SLOT} min)
Room: ${doc.room}`;
}
function makeMessage(a,doc,kind,at){
  return {id:'WA-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),apptId:a.id,to:a.phone,name:a.patient,kind,text:waText(a,doc,kind),at:(at||new Date()).toISOString(),status:'Opened in WhatsApp',to:kind==='hospital-cancel'?a.phone:HOSPITAL_WA};
}
function seed(){
  const doctors=[
    {id:'d1',name:'Dr. Ananya Rao',dept:'General Medicine',room:'OPD 2',start:9,end:17,days:[1,2,3,4,5,6],available:true},
    {id:'d2',name:'Dr. Vikram Mehta',dept:'Cardiology',room:'Heart Centre 1',start:10,end:16,days:[1,2,3,4,5],available:true},
    {id:'d3',name:'Dr. Sarah Thomas',dept:'Orthopedics',room:'OPD 5',start:9,end:14,days:[1,3,5,6],available:true},
    {id:'d4',name:'Dr. Rohan Kulkarni',dept:'Pediatrics',room:'Child Wing 3',start:9,end:17,days:[1,2,3,4,5,6],available:true},
    {id:'d5',name:'Dr. Priya Nair',dept:'Dermatology',room:'OPD 8',start:11,end:18,days:[2,4,6],available:true},
    {id:'d6',name:'Dr. Imran Qureshi',dept:'General Medicine',room:'OPD 3',start:14,end:20,days:[1,2,3,4,5],available:true},
    {id:'d7',name:'Dr. Arjun Singh',dept:'ENT',room:'OPD 6',start:9,end:13,days:[1,2,3,4,5],available:false},
    {id:'d8',name:'Dr. Kavya Menon',dept:'ENT',room:'OPD 7',start:12,end:18,days:[1,3,5],available:true}
  ];
  doctors.forEach(d=>d.email=emailFor(d.name));
  const names=['Rahul Deshpande','Fatima Shaikh','Kiran Patil','Neha Gupta','Sameer Khan','Lakshmi Iyer','Aditya Verma','Pooja Kale','John DSouza','Sunita Pawar','Harsh Bansal','Ritika Sen','Manoj Yadav','Asha Kamat'];
  const reasons=['Follow-up visit','Chest discomfort','Knee pain after running','Fever for 3 days','Skin rash','Routine check-up','Lower back pain','Child vaccination','Blood pressure review','Ear pain','Sore throat','Diabetes review'];
  let s=11;const rnd=()=>{s=(s*9301+49297)%233280;return s/233280};
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const appts=[];let seq=1001;const now=new Date();
  const taken=(id,k,t)=>appts.some(a=>a.doctorId===id&&a.date===k&&a.time===t&&a.status!=='cancelled');
  for(let off=-2;off<=5;off++){
    const k=dkey(addDays(now,off));
    doctors.forEach(doc=>slotsFor(doc,k).forEach(t=>{
      if(rnd()<0.27){
        const past=isPast(k,t);
        const status=past?(rnd()<0.86?'completed':'no-show'):(rnd()<0.08?'cancelled':'booked');
        appts.push({id:'MH-'+(seq++),doctorId:doc.id,date:k,time:t,patient:pick(names),phone:'9'+String(Math.floor(rnd()*1e9)).padStart(9,'0'),reason:pick(reasons),status});
      }
    }));
  }
  // demo patient so "My appointments" has something to show
  const demo={patient:'Meera Joshi',phone:'9876543210',email:'meera.joshi@gmail.com',whatsapp:true};
  const place=(offsets,wantPast,status,reason)=>{
    for(const off of offsets){const k=dkey(addDays(now,off));
      for(const doc of doctors){const t=slotsFor(doc,k).find(t=>isPast(k,t)===wantPast&&!taken(doc.id,k,t)&&toMin(t)>=600);
        if(t){appts.push({id:'MH-'+(seq++),doctorId:doc.id,date:k,time:t,...demo,reason,status});return}}}
  };
  place([2,3,4,5,6],false,'booked','Follow-up visit');
  place([6,7,8,9],false,'booked','Skin rash');
  place([-2,-1,-3,-4],true,'completed','Routine check-up');
  const messages=appts.filter(a=>a.email===demo.email).map(a=>makeMessage(a,doctors.find(d=>d.id===a.doctorId),'confirmation',new Date(Date.now()-86400000*3))).reverse();
  const profiles={[demo.email]:{name:demo.patient,email:demo.email,phone:demo.phone,whatsapp:true}};
  return {doctors,appts,seq,messages,profiles};
}
function load(){try{const s=localStorage.getItem(KEY);if(s){const d=JSON.parse(s);if(d&&d.doctors&&d.appts){d.messages=d.messages||[];d.profiles=d.profiles||{};return d}}}catch(e){}return null}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
let state=load();if(!state){state=seed();save()}

const docById=id=>state.doctors.find(d=>d.id===id);
const takenBy=(id,k,t)=>state.appts.find(a=>a.doctorId===id&&a.date===k&&a.time===t&&a.status!=='cancelled');
const freeSlots=(doc,k)=>slotsFor(doc,k).filter(t=>!isPast(k,t)&&!takenBy(doc.id,k,t));
function nextAvailable(doc){
  if(!doc||!doc.available)return null;
  for(let i=0;i<DAYS_AHEAD;i++){const k=dkey(addDays(new Date(),i));const f=freeSlots(doc,k);if(f.length)return{k,t:f[0]}}
  return null;
}
const byWhen=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time);

/* ---------- ui state ---------- */
const freshBooking=()=>{const u=sessions.patient;return {dept:'',doctorId:'',date:'',time:'',name:u?u.name:'',phone:u?fmtPhone(u.phone):'',reason:'',whatsapp:u?u.whatsapp!==false:true}};
let sessions={patient:null,doctor:null,admin:null};
try{const x=JSON.parse(localStorage.getItem(SKEY)||'null');if(x)sessions=Object.assign(sessions,x)}catch(e){}
const saveSessions=()=>{try{localStorage.setItem(SKEY,JSON.stringify(sessions))}catch(e){}};

const PATIENT_ACCOUNTS=[{name:'Meera Joshi',email:'meera.joshi@gmail.com'},{name:'Rahul Deshpande',email:'rahul.deshpande@gmail.com'}];
const ADMIN_ACCOUNTS=[{name:'Front desk admin',email:'frontdesk@meridianhospital.in'},{name:'Hospital manager',email:'manager@meridianhospital.in'}];
const accountsFor=r=>r==='patient'?PATIENT_ACCOUNTS:r==='doctor'?state.doctors.map(d=>({name:d.name,email:d.email,docId:d.id})):ADMIN_ACCOUNTS;
const freshAuth=()=>({step:'start',pending:null,err:''});
/* doctor passwords: salted SHA-256 in this demo; the real server should use bcrypt or argon2 */
state.doctorAuth=state.doctorAuth||{};
async function hashPw(pw,salt){
  const str=salt+':'+pw;const data=window.TextEncoder?new TextEncoder().encode(str):Uint8Array.from(unescape(encodeURIComponent(str)),c=>c.charCodeAt(0));
  if(window.crypto&&crypto.subtle){const h=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  let h=5381;for(const c of data)h=((h<<5)+h+c)>>>0;return 'x'+h.toString(16);
}
const newSalt=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const pwRules=pw=>[[pw.length>=8,'At least 8 characters'],[/[A-Za-z]/.test(pw)&&/\d/.test(pw),'Letters and at least one number'],[/[^A-Za-z0-9]/.test(pw),'At least one symbol, like @ or #']];
const DEMO_PW=CFG.demoDoctorPassword;
function seedDemoPw(){state.doctorAuth=state.doctorAuth||{};if(!state.doctorAuth.d1&&!state.demoPwSeeded){const salt=newSalt();return hashPw(DEMO_PW,salt).then(hash=>{state.doctorAuth.d1={salt,hash,fails:0,lockUntil:0};state.demoPwSeeded=true;save()})}}
seedDemoPw();
let ui=null;
if(sessions.doctor&&!docById(sessions.doctor.docId))sessions.doctor=null;
ui={role:'patient',ptab:'book',bk:freshBooking(),auth:freshAuth(),errors:[],confirmed:null,
    lookup:'',looked:false,pendingCancel:'',docId:state.doctors[0].id,docDate:today(),atab:'appts',
    f:{date:today(),dept:'',doctor:'',status:'',q:''},docErr:'',confirmReset:false};

let toastTimer;
function toast(msg){const el=document.getElementById('toast');el.innerHTML=`<div class="toast">${esc(msg)}</div>`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.innerHTML=''},2600)}

/* ---------- views ---------- */
const tab=(key,val,label)=>`<button role="tab" aria-selected="${ui[key]===val}" data-act="set" data-k="${key}" data-v="${val}">${label}</button>`;
const badge=s=>`<span class="badge b-${s}">${STATUS[s]}</span>`;

function header(){
  const u=ui.role==='patient'?sessions.patient:ui.role==='doctor'?sessions.doctor:null;
  const r=(v,l)=>`<button role="tab" aria-selected="${ui.role===v}" data-act="set" data-k="role" data-v="${v}">${l}</button>`;
  return `<header class="top"><div class="wrap top-in">
    <div class="brand"><span class="mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M6.5 1h5v5.5H17v5h-5.5V17h-5v-5.5H1v-5h5.5z" fill="currentColor"/></svg></span>${esc(HOSPITAL)}<span class="demo">Demo</span></div>
    <div class="top-right">${u?`<div class="user"><span class="avatar" aria-hidden="true">${initials(u.name)}</span><span class="who2"><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></span><button class="linkbtn" data-act="signOut">Sign out</button></div>`:''}
    <nav class="roles" role="tablist" aria-label="View the app as">${r('patient','Patient')}${r('doctor','Doctor')}${r('admin','Admin')}</nav></div>
  </div></header>`;
}
function footer(){
  return `<footer><div class="wrap"><span>This is a demo. Bookings are saved in this browser only.</span>
  ${ui.confirmReset?`<span class="ask">Erase all changes and restore sample data? <button class="btn small danger" data-act="reset">Reset data</button><button class="btn small ghost" data-act="set" data-k="confirmReset" data-v="">Keep my data</button></span>`
  :`<button class="linkbtn" data-act="reset">Reset demo data</button>`}</div></footer>`;
}

/* sign in */
function signInView(role){
  const a=ui.auth;
  const intro={patient:['Sign in to book','Use your Google account to book and manage your visits.'],
    doctor:['Doctor sign in','Sign in with your hospital Google account, then enter your password. You\u2019ll only see your own schedule.'],
    admin:['Admin sign in','Sign in with your hospital Google account to manage bookings and doctors.']}[role];
  let b;
  if(a.step==='choose'){
    b=`<h2>Choose an account</h2><p class="sub">to continue to ${esc(HOSPITAL)}</p><div class="accounts">${accountsFor(role).map((x,i)=>`<button class="acct" data-act="pickAccount" data-v="${i}"><span class="avatar" aria-hidden="true">${initials(x.name)}</span><span><strong>${esc(x.name)}</strong><small>${esc(x.email)}</small></span></button>`).join('')}
    ${role!=='admin'?`<button class="acct" data-act="authStep" data-v="other"><span class="avatar" aria-hidden="true">+</span><span><strong>Use another account</strong></span></button>`:''}</div>
    <button class="linkbtn" data-act="authStep" data-v="start">Back</button>`;
  }else if(a.step==='other'){
    b=`<h2>Use another account</h2><p class="sub">Enter the Google account you want to sign in with.</p>
    <div class="field"><label for="au-name">Full name</label><input id="au-name" autocomplete="name"></div>
    <div class="field"><label for="au-email">Email</label><input id="au-email" type="email" autocomplete="email" placeholder="${role==='doctor'?'you@meridianhospital.in':'you@gmail.com'}"></div>
    ${a.err?`<p class="err">${esc(a.err)}</p>`:''}<div class="actions" style="justify-content:flex-start"><button class="btn" data-act="otherAccount">Continue</button><button class="btn ghost" data-act="authStep" data-v="choose">Back</button></div>`;
  }else if(a.step==='create-pw'){
    b=`<h2>Create your password</h2><p class="sub">Welcome, ${esc(a.pending.name)}. Your Google account is verified. Set a password you'll enter each time you sign in.</p>
    <div class="field"><label for="pw1">New password</label><div class="pw-row"><input id="pw1" type="password" autocomplete="new-password" data-pw><button class="linkbtn" data-act="togglePw" type="button">Show</button></div></div>
    <ul class="rules" id="pwRules">${pwRules('').map(([ok,t])=>`<li class="${ok?'ok':''}">${t}</li>`).join('')}</ul>
    <div class="field"><label for="pw2">Confirm password</label><input id="pw2" type="password" autocomplete="new-password"></div>
    ${a.err?`<p class="err">${esc(a.err)}</p>`:''}<button class="btn block" data-act="createPw">Create password and sign in</button>`;
  }else if(a.step==='enter-pw'){
    const rec=state.doctorAuth[a.pending.docId];const locked=rec&&rec.lockUntil>Date.now();
    b=`<div class="acct" style="cursor:default;margin-bottom:18px"><span class="avatar" aria-hidden="true">${initials(a.pending.name)}</span><span><strong>${esc(a.pending.name)}</strong><small>${esc(a.pending.email)}</small></span></div>
    <h2>Enter your password</h2><p class="sub">Your Google account is verified. Enter your password to continue.</p>
    <div class="field"><label for="pw1">Password</label><div class="pw-row"><input id="pw1" type="password" autocomplete="current-password" ${locked?'disabled':''}><button class="linkbtn" data-act="togglePw" type="button">Show</button></div></div>
    ${locked?`<p class="err">Too many wrong attempts. Try again after ${new Date(rec.lockUntil).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}.</p>`:a.err?`<p class="err">${esc(a.err)}</p>`:''}
    <button class="btn block" data-act="checkPw" ${locked?'disabled':''}>Sign in</button>
    <p class="hint">Forgot your password? Ask the hospital admin to reset it, then create a new one here.</p>
    <button class="linkbtn" data-act="authStep" data-v="choose">Use a different account</button>`;
  }else if(a.step==='phone'){
    b=`<h2>Add your mobile number</h2><p class="sub">Hi ${esc(a.pending.name.split(' ')[0])}, the hospital will use this number to reach you about your visits. You only need to do this once.</p>
    <div class="field"><label for="au-phone">Mobile number</label><input id="au-phone" inputmode="numeric" autocomplete="tel" placeholder="10-digit number"></div>
    ${a.err?`<p class="err">${esc(a.err)}</p>`:''}<button class="btn block" data-act="finishPatient">Finish signing in</button>`;
  }else{
    b=`<h2>${intro[0]}</h2><p class="sub">${intro[1]}</p><button class="gbtn" data-act="authStep" data-v="choose">Continue with Google</button>`;
  }
  const note=role==='doctor'?`Demo: ${esc(state.doctors[0].name)} already has the password <strong>${DEMO_PW}</strong>. Any other doctor creates one on first sign-in. In the live app, the Google step opens Google's real sign-in page.`:`Demo sign-in: pick a sample account. In the live app this opens Google's real sign-in page.`;
  return `<div class="auth">${b}<p class="demo-note">${note}</p></div>`;
}

/* patient */
function patientView(){
  if(!sessions.patient)return signInView('patient');
  return `<div class="page-head"><h1>Patient portal</h1><p class="lede">Book a visit with one of our doctors, or check and cancel the visits you already have.</p></div>
  <div class="tabs" role="tablist">${tab('ptab','book','Book an appointment')}${tab('ptab','mine','My appointments')}</div>
  ${ui.ptab==='book'?bookView():mineView()}`;
}
const step=(n,title,done,body)=>`<section class="step ${done?'done':''}"><div class="step-h"><span class="num" aria-hidden="true">${done?'✓':n}</span><h2>${title}</h2></div>${body}</section>`;

function bookView(){
  if(ui.confirmed)return confirmView();
  const b=ui.bk,doc=docById(b.doctorId);
  let h=`<div class="book"><div class="steps">`;
  h+=step(1,'Choose a department',!!b.dept,`<div class="chips">${DEPTS.map(d=>`<button class="chip" aria-pressed="${b.dept===d}" data-act="pickDept" data-v="${esc(d)}">${esc(d)}</button>`).join('')}</div>`);
  if(b.dept){
    const docs=state.doctors.filter(d=>d.dept===b.dept);
    h+=step(2,'Choose a doctor',!!doc,docs.length?`<div class="doclist">${docs.map(docRow).join('')}</div>`:`<p class="muted">No doctors are listed in ${esc(b.dept)} yet.</p>`);
  }
  if(doc)h+=step(3,'Pick a date and time',!!b.time,dateStrip(doc)+slotGrid(doc));
  if(b.time)h+=step(4,'Your details',false,detailsForm());
  return h+`</div>${summary()}</div>`;
}
function docRow(d){
  const na=nextAvailable(d);
  return `<button class="doc" aria-pressed="${ui.bk.doctorId===d.id}" data-act="pickDoc" data-v="${d.id}" ${d.available?'':'disabled'}>
    <span class="avatar" aria-hidden="true">${initials(d.name)}</span>
    <span class="who"><strong>${esc(d.name)}</strong><br><span class="meta">${esc(d.room)}, ${daysLabel(d.days)}, ${fmtHour(d.start)} to ${fmtHour(d.end)}</span></span>
    <span class="next">${!d.available?'On leave':na?`Next available<strong>${fmtDate(na.k)}, ${fmtTime(na.t)}</strong>`:`Fully booked for ${DAYS_AHEAD} days`}</span>
  </button>`;
}
function dateStrip(doc){
  let o=`<div class="dates" role="group" aria-label="Dates">`;
  for(let i=0;i<DAYS_AHEAD;i++){
    const k=dkey(addDays(new Date(),i)),d=parseKey(k),free=freeSlots(doc,k).length;
    o+=`<button class="date" aria-pressed="${ui.bk.date===k}" data-act="pickDate" data-v="${k}" ${free?'':'disabled'} aria-label="${fmtDate(k,true)}, ${free?free+' times open':'not available'}">
      <span class="wd">${i===0?'Today':DAYN[d.getDay()]}</span><span class="dn">${d.getDate()}</span><span class="mo">${d.toLocaleDateString('en-GB',{month:'short'})}</span></button>`;
  }
  return o+`</div>`;
}
function slotGrid(doc){
  const k=ui.bk.date;
  if(!k)return `<p class="hint">Choose a date to see open times.</p>`;
  const all=slotsFor(doc,k);
  const btn=t=>{const tk=takenBy(doc.id,k,t),p=isPast(k,t);
    return `<button class="slot ${tk?'taken':''} ${p&&!tk?'past':''}" aria-pressed="${ui.bk.time===t}" data-act="pickTime" data-v="${t}" ${tk||p?'disabled':''} aria-label="${fmtTime(t)}${tk?', booked':p?', passed':''}">${fmtTime(t)}</button>`};
  const am=all.filter(t=>toMin(t)<720),pm=all.filter(t=>toMin(t)>=720);
  return (am.length?`<div class="slot-group"><h3>Morning</h3><div class="slots">${am.map(btn).join('')}</div></div>`:'')+
         (pm.length?`<div class="slot-group"><h3>Afternoon and evening</h3><div class="slots">${pm.map(btn).join('')}</div></div>`:'')+
         `<p class="hint">Striped times are already booked. Each visit is ${SLOT} minutes.</p>`;
}
function detailsForm(){
  const b=ui.bk;
  return `<div class="form-grid">
    <div class="field"><label for="f-name">Full name</label><input id="f-name" data-input="name" autocomplete="name" value="${esc(b.name)}"></div>
    <div class="field"><label for="f-phone">Mobile number</label><input id="f-phone" data-input="phone" inputmode="numeric" autocomplete="tel" placeholder="10-digit number" value="${esc(b.phone)}"></div>
    <div class="field full"><label for="f-reason">Reason for visit <span class="muted" style="font-weight:400">(optional)</span></label><textarea id="f-reason" rows="3" data-input="reason" placeholder="A few words help the doctor prepare">${esc(b.reason)}</textarea></div>
  </div><p class="hint" style="margin-top:0">Booking for a family member? Change the name and number above.</p>`;
}
function summary(){
  const b=ui.bk,doc=docById(b.doctorId);
  const row=(l,v)=>`<div><dt>${l}</dt><dd class="${v?'':'empty'}">${v?esc(v):'Not chosen yet'}</dd></div>`;
  return `<aside class="summary" aria-live="polite"><h2>Your appointment</h2>
    <dl>${row('Department',b.dept)}${row('Doctor',doc&&doc.name)}${row('Date',b.date&&fmtDate(b.date,true))}${row('Time',b.time&&fmtTime(b.time))}</dl>
    ${ui.errors.map(e=>`<p class="err">${esc(e)}</p>`).join('')}
    <button class="btn block" data-act="confirm" ${b.time?'':'disabled'}>Confirm booking</button>
    <p class="small-print">After you confirm, WhatsApp opens with your booking details ready to send to the hospital.</p></aside>`;
}
function confirmView(){
  const a=state.appts.find(x=>x.id===ui.confirmed);if(!a){ui.confirmed=null;return bookView()}
  const doc=docById(a.doctorId);
  const card=`<div class="confirm-card">
    <div class="tick" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <h2>Appointment booked</h2><p class="muted" style="margin:6px 0 0">Your reference number</p><div class="ref">${a.id}</div>
    <dl class="kv"><dt>Patient</dt><dd>${esc(a.patient)}</dd><dt>Doctor</dt><dd>${esc(doc.name)}</dd><dt>Department</dt><dd>${esc(doc.dept)}</dd>
    <dt>When</dt><dd>${fmtDate(a.date,true)}, ${fmtTime(a.time)}</dd><dt>Where</dt><dd>${esc(doc.room)}</dd></dl>
    <p class="note" style="text-align:left">Please arrive 15 minutes early and bring a photo ID and any previous reports.</p>
    <div class="actions"><button class="btn" data-act="goMine">View my appointments</button><button class="btn ghost" data-act="bookAnother">Book another appointment</button></div></div>`;
  const m=state.messages.find(x=>x.apptId===a.id&&x.kind==='confirmation');
  const phone=m?`<section class="phone-wrap" aria-label="WhatsApp message for the hospital"><h3>Your booking details on WhatsApp</h3>
    <div class="phone"><div class="phone-bar"><span class="avatar" aria-hidden="true">+</span><div><strong>${esc(HOSPITAL)}</strong><small>Business account</small></div></div>
    <div class="chat"><span class="day-pill">Today</span><div class="bubble out">${esc(m.text)}<time>${new Date(m.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</time></div></div></div>
    <a class="btn wa-btn" href="${waLink(HOSPITAL_WA,m.text)}" target="_blank" rel="noopener">Open WhatsApp</a>
    <p class="hint">WhatsApp opened in a new tab. Tap send there so the hospital gets your booking and you keep a copy. If it didn't open, use the button above.</p></section>`
    :`<section class="phone-wrap"><p class="muted">WhatsApp updates are turned off for this booking.</p></section>`;
  return `<div class="confirm-grid">${card}${phone}</div>`;
}
function mineView(){
  const u=sessions.patient;
  const mine=state.appts.filter(a=>(a.email&&a.email===u.email)||a.phone===digits(u.phone)).sort(byWhen);
  let h=`<p class="muted" style="margin-top:0">Bookings made by ${esc(u.email)} or for ${fmtPhone(u.phone)}.</p>`;
  if(!mine.length)return h+`<div class="empty">You don't have any appointments yet. <button class="linkbtn" data-act="set" data-k="ptab" data-v="book">Book an appointment</button></div>`;
  return h+mineList(mine);
}
function oldLookupView(){
  let h=`<div class="field" style="max-width:500px;margin-bottom:6px"><label for="lk">Mobile number used when booking</label>
    <div class="lookup"><input id="lk" inputmode="numeric" autocomplete="tel" placeholder="10-digit number" value="${esc(ui.lookup)}"><button class="btn" data-act="lookup">Find appointments</button></div></div>
    <p class="hint" style="margin-top:0">To try the demo, use 98765 43210.</p>`;
  if(!ui.looked)return h;
  const p=digits(ui.lookup);
  if(p.length!==10)return h+`<p class="err" style="margin-top:16px">Enter a 10-digit mobile number.</p>`;
  const mine=state.appts.filter(a=>a.phone===p).sort(byWhen);
  if(!mine.length)return h+`<div class="empty">No appointments found for ${fmtPhone(p)}. <button class="linkbtn" data-act="set" data-k="ptab" data-v="book">Book an appointment</button></div>`;
  return h+mineList(mine);
}
function mineList(mine){
  let h='';
  const up=mine.filter(a=>a.status==='booked'&&!isPast(a.date,a.time));
  const rest=mine.filter(a=>!up.includes(a)).reverse();
  h+=`<h2 class="section-title">Upcoming</h2>`+(up.length?up.map(a=>apptCard(a,true)).join(''):`<p class="muted">Nothing coming up. <button class="linkbtn" data-act="set" data-k="ptab" data-v="book">Book an appointment</button></p>`);
  if(rest.length)h+=`<h2 class="section-title">Past and cancelled</h2>`+rest.map(a=>apptCard(a,false)).join('');
  return h;
}
function cancelControl(a){
  return ui.pendingCancel===a.id
    ?`<span class="ask">Cancel this visit? <button class="btn small danger" data-act="doCancel" data-v="${a.id}">Yes, cancel</button><button class="btn small ghost" data-act="set" data-k="pendingCancel" data-v="">Keep it</button></span>`
    :`<button class="btn small ghost danger-text" data-act="set" data-k="pendingCancel" data-v="${a.id}">Cancel</button>`;
}
function apptCard(a,canCancel){
  const d=parseKey(a.date),doc=docById(a.doctorId)||{name:'Doctor removed',dept:'',room:''};
  return `<article class="appt ${canCancel?'':'dim'}"><div class="cal"><span class="wd">${DAYN[d.getDay()]}</span><span class="dn">${d.getDate()}</span><span class="mo">${d.toLocaleDateString('en-GB',{month:'short'})}</span></div>
    <div class="info"><strong>${fmtTime(a.time)} with ${esc(doc.name)}</strong><div class="muted">${esc(doc.dept)}, ${esc(doc.room)}. Ref ${a.id}</div>${a.reason?`<div class="muted">${esc(a.reason)}</div>`:''}</div>
    <div class="right">${badge(a.status)}${canCancel?cancelControl(a):''}</div></article>`;
}

/* doctor */
function doctorView(){
  if(!sessions.doctor)return signInView('doctor');
  const doc=docById(sessions.doctor.docId);ui.docId=doc.id;
  const list=state.appts.filter(a=>a.doctorId===doc.id&&a.date===ui.docDate).sort(byWhen);
  const c=s=>list.filter(a=>a.status===s).length;
  const isToday=ui.docDate===today();
  const nextUp=isToday?list.find(a=>a.status==='booked'&&!isPast(a.date,a.time)):null;
  let h=`<div class="page-head"><h1>Doctor's schedule</h1><p class="lede">See who's coming in and record each visit as it happens. Visits are ${SLOT} minutes each.</p></div>
  <div class="toolbar">
    <div><strong>${esc(doc.name)}</strong><div class="muted">${esc(doc.dept)}, ${esc(doc.room)}, ${daysLabel(doc.days)}, ${fmtHour(doc.start)} to ${fmtHour(doc.end)}</div></div>
    <div class="daynav"><button class="btn ghost small" data-act="docDay" data-v="-1">Previous day</button><button class="btn ghost small" data-act="docToday" ${isToday?'disabled':''}>Today</button><button class="btn ghost small" data-act="docDay" data-v="1">Next day</button></div>
  </div>
  <h2 class="day-title">${isToday?'Today, ':''}${fmtDate(ui.docDate,true)}</h2>`;
  if(!doc.available)h+=`<p class="note warn">You're marked as on leave, so patients can't book new visits. An admin can mark you available again.</p>`;
  h+=`<div class="stats"><div class="stat"><b>${list.length-c('cancelled')}</b><span>Patients</span></div><div class="stat"><b>${c('booked')}</b><span>Still to see</span></div><div class="stat"><b>${c('completed')}</b><span>Completed</span></div><div class="stat"><b>${c('no-show')}</b><span>Missed</span></div><div class="stat"><b>${c('cancelled')}</b><span>Cancelled</span></div></div>`;
  if(!list.length)return h+`<div class="schedule"><div class="empty">No appointments on this day.</div></div>`;
  h+=`<div class="schedule">`+list.map(a=>{
    let act;
    if(a.status==='booked')act=`<button class="btn small" data-act="setStatus" data-id="${a.id}" data-v="completed">Mark completed</button><button class="btn small ghost" data-act="setStatus" data-id="${a.id}" data-v="no-show">Mark missed</button>`;
    else if(a.status==='cancelled')act=badge(a.status);
    else act=`${badge(a.status)}<button class="linkbtn" style="font-size:.85rem" data-act="setStatus" data-id="${a.id}" data-v="booked">Undo</button>`;
    return `<div class="srow ${a.status==='cancelled'?'dim':''} ${nextUp&&nextUp.id===a.id?'nowish':''}"><div class="stime">${fmtTime(a.time)}</div>
      <div><strong>${esc(a.patient)}</strong>${nextUp&&nextUp.id===a.id?' <span class="badge b-booked">Next</span>':''}<div class="muted">${esc(a.reason||'No reason given')}. ${fmtPhone(a.phone)}, ${a.id}</div></div>
      <div class="sact">${act}</div></div>`;
  }).join('')+`</div>`;
  return h;
}

/* admin */
function adminView(){
  return `<div class="page-head"><h1>Hospital admin</h1><p class="lede">Manage every booking across departments and keep doctor availability up to date.</p></div>
  <div class="tabs" role="tablist">${tab('atab','appts','Appointments')}${tab('atab','doctors','Doctors')}${tab('atab','messages','WhatsApp messages')}</div>
  ${ui.atab==='appts'?adminAppts():ui.atab==='doctors'?adminDoctors():adminMessages()}`;
}
function adminMessages(){
  const ms=state.messages;
  let h=`<p class="note">When a patient books or cancels, WhatsApp opens on their device with the details ready to send to the hospital's number. When staff cancel a booking, WhatsApp opens a chat with the patient instead. The message is only sent once the person taps send.</p>`;
  if(!ms.length)return h+`<div class="table-wrap"><div class="empty">No messages sent yet. Book an appointment as a patient to send one.</div></div>`;
  h+=`<div class="table-wrap"><table><thead><tr><th>Opened</th><th>To</th><th>Patient</th><th>Type</th><th>Ref</th><th>Status</th><th>Message</th></tr></thead><tbody>`;
  h+=ms.map(m=>{const d=new Date(m.at);return `<tr><td class="nowrap">${d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}, ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</td><td class="nowrap">${m.to===HOSPITAL_WA?'Hospital':'+91 '+fmtPhone(m.to)}</td><td>${esc(m.name)}</td>
    <td>${m.kind==='confirmation'?'Booking, from patient':m.kind==='cancellation'?'Cancellation, from patient':'Cancellation, from hospital'}</td><td class="nowrap">${m.apptId}</td><td><span class="badge b-booked">${m.status}</span></td>
    <td><details><summary>View message</summary><div class="msg-text">${esc(m.text)}</div></details></td></tr>`}).join('');
  return h+`</tbody></table></div>`;
}
function adminAppts(){
  const f=ui.f;
  const docs=state.doctors.filter(d=>!f.dept||d.dept===f.dept);
  const opt=(v,l,cur)=>`<option value="${esc(v)}" ${v===cur?'selected':''}>${esc(l)}</option>`;
  return `<div class="filters">
    <div class="field"><label for="fd">Date</label><input type="date" id="fd" data-change="f.date" value="${f.date}"></div>
    <div class="field"><label for="fdp">Department</label><select id="fdp" data-change="f.dept">${opt('','All departments',f.dept)}${DEPTS.map(d=>opt(d,d,f.dept)).join('')}</select></div>
    <div class="field"><label for="fdo">Doctor</label><select id="fdo" data-change="f.doctor">${opt('','All doctors',f.doctor)}${docs.map(d=>opt(d.id,d.name,f.doctor)).join('')}</select></div>
    <div class="field"><label for="fst">Status</label><select id="fst" data-change="f.status">${opt('','Any status',f.status)}${Object.entries(STATUS).map(([k,v])=>opt(k,v,f.status)).join('')}</select></div>
    <div class="field"><label for="fq">Search</label><input type="search" id="fq" data-q placeholder="Patient, phone or ref" value="${esc(f.q)}"></div>
  </div>
  <div class="quick">Show: <button class="linkbtn" data-act="fDate" data-v="today">Today</button><button class="linkbtn" data-act="fDate" data-v="tomorrow">Tomorrow</button><button class="linkbtn" data-act="fDate" data-v="">All dates</button></div>
  <div id="adminResults">${adminResults()}</div>`;
}
function adminResults(){
  const f=ui.f,q=f.q.trim().toLowerCase(),qd=digits(q);
  const rows=state.appts.filter(a=>{
    const doc=docById(a.doctorId);
    if(f.date&&a.date!==f.date)return false;
    if(f.dept&&(!doc||doc.dept!==f.dept))return false;
    if(f.doctor&&a.doctorId!==f.doctor)return false;
    if(f.status&&a.status!==f.status)return false;
    if(q&&!(a.patient.toLowerCase().includes(q)||a.id.toLowerCase().includes(q)||(qd&&a.phone.includes(qd))))return false;
    return true;
  }).sort(byWhen);
  const c=s=>rows.filter(a=>a.status===s).length;
  let h=`<div class="stats"><div class="stat"><b>${rows.length}</b><span>Total ${f.date?'on '+fmtDate(f.date):'shown'}</span></div><div class="stat"><b>${c('booked')}</b><span>Booked</span></div><div class="stat"><b>${c('completed')}</b><span>Completed</span></div><div class="stat"><b>${c('no-show')}</b><span>Missed</span></div><div class="stat"><b>${c('cancelled')}</b><span>Cancelled</span></div></div>`;
  if(!rows.length)return h+`<div class="table-wrap"><div class="empty">No appointments match these filters.</div></div>`;
  h+=`<div class="table-wrap"><table><thead><tr><th>Ref</th><th>Date</th><th>Time</th><th>Patient</th><th>Mobile</th><th>Doctor</th><th>Department</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>`;
  h+=rows.map(a=>{const doc=docById(a.doctorId)||{name:'Removed',dept:''};
    return `<tr><td class="nowrap">${a.id}</td><td class="nowrap">${fmtDate(a.date)}</td><td class="nowrap">${fmtTime(a.time)}</td><td>${esc(a.patient)}</td><td class="nowrap">${fmtPhone(a.phone)}</td><td class="nowrap">${esc(doc.name)}</td><td>${esc(doc.dept)}</td><td>${badge(a.status)}</td><td class="nowrap">${a.status==='booked'&&!isPast(a.date,a.time)?cancelControl(a):''}</td></tr>`}).join('');
  return h+`</tbody></table></div>`;
}
function adminDoctors(){
  const upcoming=id=>state.appts.filter(a=>a.doctorId===id&&a.status==='booked'&&!isPast(a.date,a.time)).length;
  let h=`<p class="note">Doctors sign in with the Google email shown here and then their own password. If a doctor forgets it, reset it and they'll create a new one. Marking a doctor on leave stops new bookings. Their existing appointments stay in place so you can move or cancel them.</p>
  <div class="table-wrap"><table><thead><tr><th>Doctor</th><th>Department</th><th>Room</th><th>Days</th><th>Hours</th><th>Sign-in email</th><th>Password</th><th>Upcoming visits</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>`;
  h+=state.doctors.map(d=>`<tr><td class="nowrap"><strong>${esc(d.name)}</strong></td><td>${esc(d.dept)}</td><td>${esc(d.room)}</td><td>${daysLabel(d.days)}</td><td class="nowrap">${fmtHour(d.start)} to ${fmtHour(d.end)}</td><td>${esc(d.email)}</td><td class="nowrap">${state.doctorAuth[d.id]?`Set <button class="linkbtn" style="margin-left:6px" data-act="resetPw" data-v="${d.id}">Reset</button>`:'<span class="muted">Not created yet</span>'}</td><td>${upcoming(d.id)}</td>
    <td>${d.available?'<span class="badge b-on">Available</span>':'<span class="badge b-leave">On leave</span>'}</td>
    <td class="nowrap"><button class="btn small ghost" data-act="toggleDoc" data-v="${d.id}">${d.available?'Mark on leave':'Mark available'}</button></td></tr>`).join('');
  h+=`</tbody></table></div>`;
  const hours=(from,to,sel)=>{let o='';for(let i=from;i<=to;i++)o+=`<option value="${i}" ${i===sel?'selected':''}>${fmtHour(i)}</option>`;return o};
  h+=`<div class="panel"><h2>Add a doctor</h2><div class="form-grid">
    <div class="field"><label for="nd-name">Name</label><input id="nd-name" placeholder="e.g. Dr. Meenal Shah"></div>
    <div class="field"><label for="nd-dept">Department</label><select id="nd-dept">${DEPTS.map(d=>`<option>${esc(d)}</option>`).join('')}</select></div>
    <div class="field"><label for="nd-email">Hospital Google email</label><input id="nd-email" type="email" placeholder="name@meridianhospital.in"></div>
    <div class="field"><label for="nd-room">Room</label><input id="nd-room" placeholder="e.g. OPD 4"></div>
    <div class="field"><label>Hours</label><div style="display:flex;gap:8px;align-items:center"><select id="nd-start" aria-label="Start time">${hours(7,12,9)}</select><span class="muted">to</span><select id="nd-end" aria-label="End time">${hours(12,21,17)}</select></div></div>
    <div class="field full"><label>Working days</label><div class="days">${[1,2,3,4,5,6,0].map(i=>`<label><input type="checkbox" name="nd-day" value="${i}" ${i>=1&&i<=5?'checked':''}>${DAYN[i]}</label>`).join('')}</div></div>
  </div>${ui.docErr?`<p class="err">${esc(ui.docErr)}</p>`:''}<button class="btn" data-act="addDoctor">Add doctor</button></div>`;
  return h;
}

/* ---------- render ---------- */
function render(){
  const ae=document.activeElement;let sel=null;
  if(ae&&ae!==document.body){
    if(ae.id)sel='#'+cssEsc(ae.id);
    else if(ae.dataset&&ae.dataset.act)sel=['act','k','v','id'].filter(k=>ae.dataset[k]!=null).map(k=>`[data-${k}="${cssEsc(ae.dataset[k])}"]`).join('');
  }
  const body=ui.role==='patient'?patientView():ui.role==='doctor'?doctorView():adminView();
  $app.innerHTML=header()+`<main><div class="wrap">${body}</div></main>`+footer();
  if(sel){const el=$app.querySelector(sel);if(el&&!el.disabled)el.focus({preventScroll:true})}
}

/* ---------- actions ---------- */
function signIn(role,acc){
  if(!acc)return;
  if(role==='patient'){
    const prof=state.profiles[acc.email];
    if(prof&&prof.phone){completeSignIn('patient',prof);return}
    ui.auth={step:'phone',pending:{name:acc.name,email:acc.email},err:''};render();return;
  }
  if(role==='doctor'){
    const doc=state.doctors.find(d=>d.email===acc.email);
    if(!doc){ui.auth.err='';ui.auth={step:'other',pending:null,err:`${acc.email} isn't registered as a doctor. Ask the hospital admin to add this email.`};render();return}
    ui.auth={step:state.doctorAuth[doc.id]?'enter-pw':'create-pw',pending:{name:doc.name,email:doc.email,docId:doc.id},err:''};render();
    setTimeout(()=>{const f=document.getElementById('pw1');if(f)f.focus()},0);return;
  }
  completeSignIn(role,{name:acc.name,email:acc.email});
}
function completeSignIn(role,user){
  sessions[role]=user;saveSessions();ui.auth=freshAuth();
  if(role==='patient')ui.bk=freshBooking();
  if(role==='doctor'){ui.docId=user.docId;ui.docDate=today()}
  toast(`Signed in as ${user.name}`);render();
}
const act={
  set(ds){ui[ds.k]=ds.v;if(ds.k==='role'||ds.k==='ptab'||ds.k==='atab'){ui.pendingCancel='';ui.errors=[];ui.auth=freshAuth();if(ds.k==='role')window.scrollTo(0,0)}render()},
  pickDept(ds){if(ui.bk.dept!==ds.v)Object.assign(ui.bk,{dept:ds.v,doctorId:'',date:'',time:''});ui.errors=[];render()},
  pickDoc(ds){if(ui.bk.doctorId!==ds.v){const na=nextAvailable(docById(ds.v));Object.assign(ui.bk,{doctorId:ds.v,date:na?na.k:'',time:''})}ui.errors=[];render()},
  pickDate(ds){ui.bk.date=ds.v;ui.bk.time='';ui.errors=[];render()},
  pickTime(ds){ui.bk.time=ds.v;ui.errors=[];render();const n=document.getElementById('f-name');if(n&&!ui.bk.name)n.focus()},
  confirm(){
    const b=ui.bk,errs=[];
    if(b.name.trim().length<2)errs.push('Enter the patient\u2019s full name.');
    if(digits(b.phone).length!==10)errs.push('Enter a 10-digit mobile number.');
    if(!b.time||isPast(b.date,b.time))errs.push('That time has passed. Pick another time.');
    else if(takenBy(b.doctorId,b.date,b.time))errs.push('Someone just booked that time. Pick another time.');
    ui.errors=errs;
    if(errs.length){render();return}
    const a={id:'MH-'+(state.seq++),doctorId:b.doctorId,date:b.date,time:b.time,patient:b.name.trim(),phone:digits(b.phone),reason:b.reason.trim(),status:'booked',email:sessions.patient.email,whatsapp:true};
    state.appts.push(a);
    const msg=makeMessage(a,docById(a.doctorId),'confirmation');state.messages.unshift(msg);
    save();
    ui.confirmed=a.id;ui.lookup=fmtPhone(a.phone);ui.bk=freshBooking();
    render();window.scrollTo(0,0);
    openWA(HOSPITAL_WA,msg.text);
  },
  bookAnother(){ui.confirmed=null;render()},
  goMine(){ui.confirmed=null;ui.ptab='mine';ui.looked=true;render()},
  lookup(){const el=document.getElementById('lk');ui.lookup=el?el.value:ui.lookup;ui.looked=true;ui.pendingCancel='';render()},
  doCancel(ds){const a=state.appts.find(x=>x.id===ds.v);if(a){a.status='cancelled';
    const byHospital=ui.role!=='patient';const m=makeMessage(a,docById(a.doctorId),byHospital?'hospital-cancel':'cancellation');state.messages.unshift(m);save();
    openWA(byHospital?'91'+a.phone:HOSPITAL_WA,m.text);toast(`${a.id} cancelled. WhatsApp opened to share the update.`)}ui.pendingCancel='';render()},
  setStatus(ds){const a=state.appts.find(x=>x.id===ds.id);if(!a)return;a.status=ds.v;save();
    toast(ds.v==='completed'?`${a.patient} marked completed`:ds.v==='no-show'?`${a.patient} marked missed`:'Change undone');render()},
  docDay(ds){ui.docDate=dkey(addDays(parseKey(ui.docDate),Number(ds.v)));render()},
  docToday(){ui.docDate=today();render()},
  fDate(ds){ui.f.date=ds.v==='today'?today():ds.v==='tomorrow'?dkey(addDays(new Date(),1)):'';render()},
  toggleDoc(ds){const d=docById(ds.v);if(!d)return;d.available=!d.available;save();toast(`${d.name} marked ${d.available?'available':'on leave'}`);render()},
  addDoctor(){
    let name=document.getElementById('nd-name').value.trim();
    const dept=document.getElementById('nd-dept').value,room=document.getElementById('nd-room').value.trim()||'OPD';
    const start=+document.getElementById('nd-start').value,end=+document.getElementById('nd-end').value;
    const days=[...document.querySelectorAll('input[name="nd-day"]:checked')].map(i=>+i.value);
    if(name.length<3){ui.docErr='Enter the doctor\u2019s name.';render();return}
    if(end<=start){ui.docErr='End time must be after start time.';render();return}
    if(!days.length){ui.docErr='Choose at least one working day.';render();return}
    if(!/^dr\.?\s/i.test(name))name='Dr. '+name;
    const em=document.getElementById('nd-email').value.trim().toLowerCase();
    if(em&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ui.docErr='Enter a valid email or leave it blank.';render();return}
    if(state.doctors.some(d=>d.email===(em||emailFor(name)))){ui.docErr='Another doctor already uses that email.';render();return}
    state.doctors.push({id:'d'+Date.now().toString(36),name,email:em||emailFor(name),dept,room,start,end,days,available:true});save();
    ui.docErr='';toast(`${name} added to ${dept}`);render();
  },
  authStep(ds){ui.auth.step=ds.v;ui.auth.err='';render()},
  pickAccount(ds){signIn(ui.role,accountsFor(ui.role)[+ds.v])},
  otherAccount(){
    const name=document.getElementById('au-name').value.trim(),email=document.getElementById('au-email').value.trim().toLowerCase();
    if(name.length<2){ui.auth.err='Enter your full name.';render();return}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ui.auth.err='Enter a valid email address.';render();return}
    signIn(ui.role,{name,email});
  },
  togglePw(){['pw1','pw2'].forEach(id=>{const f=document.getElementById(id);if(f)f.type=f.type==='password'?'text':'password'});
    const b=document.querySelector('[data-act=togglePw]');if(b)b.textContent=b.textContent==='Show'?'Hide':'Show'},
  async createPw(){
    const p1=document.getElementById('pw1').value,p2=document.getElementById('pw2').value,pend=ui.auth.pending;
    if(!pwRules(p1).every(r=>r[0])){ui.auth.err='Your password doesn\u2019t meet all the rules yet.';render();return}
    if(p1!==p2){ui.auth.err='The two passwords don\u2019t match.';render();return}
    const salt=newSalt();state.doctorAuth[pend.docId]={salt,hash:await hashPw(p1,salt),fails:0,lockUntil:0};save();
    completeSignIn('doctor',pend);
  },
  async checkPw(){
    const pend=ui.auth.pending,rec=state.doctorAuth[pend.docId],pw=document.getElementById('pw1').value;
    if(!rec){ui.auth.step='create-pw';render();return}
    if(rec.lockUntil>Date.now()){render();return}
    if(await hashPw(pw,rec.salt)===rec.hash){rec.fails=0;save();completeSignIn('doctor',pend);return}
    rec.fails=(rec.fails||0)+1;
    if(rec.fails>=5){rec.lockUntil=Date.now()+5*60000;rec.fails=0;ui.auth.err=''}else ui.auth.err=`That password isn't right. ${5-rec.fails} ${5-rec.fails===1?'try':'tries'} left before a 5-minute lock.`;
    save();render();
  },
  resetPw(ds){delete state.doctorAuth[ds.v];save();const d=docById(ds.v);toast(`Password reset. ${d.name} will create a new one at next sign-in.`);render()},
  finishPatient(){
    const phone=digits(document.getElementById('au-phone').value),wa=true;
    if(phone.length!==10){ui.auth.err='Enter a 10-digit mobile number.';render();return}
    const prof={...ui.auth.pending,phone,whatsapp:wa};
    state.profiles[prof.email]=prof;save();completeSignIn('patient',prof);
  },
  signOut(){const u=sessions[ui.role];sessions[ui.role]=null;saveSessions();ui.auth=freshAuth();ui.confirmed=null;if(ui.role==='patient')ui.bk=freshBooking();toast(`${u?u.name:'You'} signed out`);render()},
  reset(){
    if(!ui.confirmReset){ui.confirmReset=true;render();return}
    state=seed();seedDemoPw();save();sessions.doctor=null;saveSessions();
    Object.assign(ui,{confirmReset:false,confirmed:null,pendingCancel:'',errors:[],docId:state.doctors[0].id,bk:{dept:'',doctorId:'',date:'',time:'',name:'',phone:'',reason:''}});
    toast('Demo data reset');render();
  }
};

document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const f=act[b.dataset.act];if(f)f(b.dataset,b)});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.hasAttribute('data-pw')){const r=document.getElementById('pwRules');if(r)r.innerHTML=pwRules(t.value).map(([ok,x])=>`<li class="${ok?'ok':''}">${x}</li>`).join('')}
  else if(t.dataset.input){ui.bk[t.dataset.input]=t.value}
  else if(t.hasAttribute('data-q')){ui.f.q=t.value;const r=document.getElementById('adminResults');if(r)r.innerHTML=adminResults()}
  else if(t.id==='lk'){ui.lookup=t.value}
});
document.addEventListener('change',e=>{
  if(e.target.id==='f-wa'){ui.bk.whatsapp=e.target.checked;return}
  const k=e.target.dataset.change;if(!k)return;
  if(k==='docId')ui.docId=e.target.value;
  else if(k.startsWith('f.')){const f=k.slice(2);ui.f[f]=e.target.value;if(f==='dept')ui.f.doctor=''}
  render();
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='pw1'||e.target.id==='pw2')){e.preventDefault();if(ui.auth.step==='enter-pw')act.checkPw();else if(e.target.id==='pw2')act.createPw();return}if(e.key==='Enter'&&e.target.id==='lk'){e.preventDefault();act.lookup()}});

render();
})();
