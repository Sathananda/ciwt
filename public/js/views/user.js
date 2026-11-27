import {act,svc} from '../api.js';
import {CATS} from '../config.js';
import {S,gi,overdue,wOf} from '../state.js';
import {CC,badge,btn,card,empty,err,fld,ic,inp2,kv,page,photos,pnl,toast,welcome} from '../ui.js';
import {esc,fd,fmt} from '../util.js';

export async function addPhotos(input){
 const e=document.getElementById('e-ph');e.textContent='';
 for(const f of input.files){
  if(S.photos.length>=3){e.textContent='Photos: a maximum of 3 images is allowed.';break}
  if(!['image/jpeg','image/png'].includes(f.type)){e.textContent=`Photos: "${f.name}" must be JPEG or PNG.`;continue}
  if(f.size>5*1048576){e.textContent=`Photos: "${f.name}" exceeds 5 MB.`;continue}
  const b=new Uint8Array(await f.slice(0,4).arrayBuffer()),jp=b[0]==255&&b[1]==216&&b[2]==255,pn=b[0]==137&&b[1]==80&&b[2]==78&&b[3]==71;
  if(!(jp||pn)){e.textContent=`Photos: "${f.name}" is not a valid image file.`;continue}
  const url=await new Promise(r=>{const x=new FileReader();x.onload=()=>r(x.result);x.readAsDataURL(f)});S.photos.push({name:f.name,url,file:f})}
 input.value='';document.getElementById('ph').innerHTML=S.photos.map((p,i)=>`<div class="relative"><img src="${p.url}" alt="${esc(p.name)}" class="w-16 h-16 object-cover rounded-lg"><button type="button" aria-label="Remove ${esc(p.name)}" onclick="S.photos.splice(${i},1);this.parentNode.remove()" class="absolute -top-1 -right-1 bg-rose-500 rounded-full w-5 h-5 text-xs">×</button></div>`).join('')}
export function submitIssue(e){e.preventDefault();const f=new FormData(e.target),v=k=>(f.get(k)||'').toString().trim(),E={};
 if(!v('title')||v('title').length>100)E.title='Title: enter 1–100 characters.';
 if(!CATS.includes(v('cat')))E.cat='Category: please choose one.';
 if(!v('loc'))E.loc='Location: this field is required.';
 if(!v('desc')||v('desc').length>500)E.desc='Description: enter 1–500 characters.';
 if(!f.get('ack'))E.ack='Please acknowledge the privacy notice to submit.';
 ['title','cat','loc','desc','ack'].forEach(k=>document.getElementById('e-'+k).textContent=E[k]||'');
 if(Object.keys(E).length)return false;
 act(async()=>{const i=await svc.create({title:v('title'),cat:v('cat'),loc:v('loc'),desc:v('desc'),photos:S.photos.slice()});S.photos=[];toast('Request submitted. Your Issue ID is '+i.id)});return false}
export function reqDetail(id){
 const i=gi(id);if(!i||i.uid!=S.me.id)return page('Not found',`<p class="text-zinc-400">This request does not exist or you do not have access to it.</p>`);
 const w=wOf(id),pu=w?S.pu.filter(p=>p.wo==w.id).reverse():[];
 return page(`${i.id} · ${esc(i.title)}`,`<div class="grid lg:grid-cols-2 gap-5"><section class="${card} space-y-2 text-sm">${badge(i.st)}${kv('Category',i.cat)}${kv('Location',esc(i.loc))}${kv('Submitted',fmt(i.at))}<p class="text-zinc-300 pt-2">${esc(i.desc)}</p>${photos(i)}
 ${i.fb?`<p class="mt-3 p-3 rounded-xl bg-rose-500/10 text-rose-200"><b>Closure feedback:</b> ${esc(i.fb)}</p>`:''}
 ${i.st=='In-Progress'?`<button class="${btn} mt-3" onclick="confirm('Mark this issue as resolved? This cannot be undone.')&&act(()=>svc.resolve('${i.id}'),'Marked as resolved')">Mark as Resolved</button>`:''}</section>
 <section class="${card}"><h2 class="font-semibold mb-2">Work order</h2>${w?`<div class="space-y-1 text-sm">${kv('ID',w.id)}${kv('Status',w.st)}${kv('Assigned to',esc(w.who||'To be confirmed')+' ('+w.type+')')}${kv('Deadline',fd(w.dl)+(overdue(w)?' · <span class="text-rose-400">overdue</span>':''))}${w.note?kv('Resolution',esc(w.note)):''}</div>
 <h3 class="font-medium mt-4 mb-2 text-sm">Progress updates</h3>${pu.length?pu.map(p=>`<div class="border-l-2 border-violet-400/50 pl-3 mb-3 text-sm">${esc(p.d)}<div class="text-xs text-zinc-500">${fmt(p.at)}</div></div>`).join(''):empty('No progress recorded yet.')}`:empty('No work order yet. An administrator will review your request.')}</section></div>`)}
export function notes(){const n=S.notes.filter(n=>n.uid==S.me.id).sort((a,b)=>b.at<a.at?-1:1);
 return page('Notifications',`<div class="${card}">${n.length?n.map(x=>`<a href="#/req/${x.iid}" onclick="api('POST','/api/notifications/${x.id}/read').catch(()=>{});S.notes.find(n=>n.id=='${x.id}').read=true" class="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 border-b border-white/5 text-sm ${x.read?'text-zinc-500':''}">${x.read?'':'<span class="w-2 h-2 rounded-full g"></span>'}<span class="flex-1">${esc(x.m)}</span><span class="text-xs">${fmt(x.at)}</span></a>`).join(''):empty('You are all caught up.')}</div>`)}
export function userHome(){
 const mine=S.issues.filter(i=>i.uid==S.me.id).sort((a,b)=>b.at<a.at?-1:1);
 return `<main class="max-w-6xl mx-auto px-4 pb-10">${welcome(S.me.name.split(' ')[0],'Whats broken now?')}<div class="grid lg:grid-cols-[1.35fr_1fr] gap-6">
 <section class="${pnl}"><h2 class="text-sm font-medium">Create a Service Request</h2><p class="text-[.6875rem] text-amber-300/80 mt-1 mb-4">Resolve is not an emergency service. Report urgent safety incidents to the institute's emergency channels.</p>
 <form id="nf" onsubmit="return submitIssue(event)" novalidate class="grid sm:grid-cols-2 gap-5"><div class="space-y-3">
 <div>${fld('Title','<input name="title" maxlength="100" placeholder="Briefly describe the issue" class="'+inp2+'">')}${err('title')}</div>
 <div>${fld('Category','<select name="cat" class="'+inp2+'"><option value="">Select Category</option>'+CATS.map(c=>`<option>${c}</option>`).join('')+'</select>')}${err('cat')}</div>
 <div>${fld('Location','<input name="loc" placeholder="Enter Location" class="'+inp2+'">')}${err('loc')}</div>
 <div>${fld('Description','<textarea name="desc" rows="5" maxlength="500" placeholder="Provide more details of the issue" oninput="cnt.textContent=this.value.length+\'/500\'" class="'+inp2+'"></textarea>')}<div class="flex justify-between">${err('desc')}<span id="cnt" class="text-[.625rem] text-zinc-600 ml-auto">0/500</span></div></div></div>
 <div class="space-y-3"><span class="block text-xs text-zinc-300">Add Photos (Optional)</span>
 <label ondragover="event.preventDefault()" ondrop="event.preventDefault();addPhotos({files:event.dataTransfer.files,value:''})" class="flex flex-col items-center gap-2 border border-dashed border-white/20 rounded-xl py-6 px-3 text-center cursor-pointer hover:bg-white/5 focus-within:ring-2 focus-within:ring-pink-300"><span class="w-9 h-9 grid place-items-center rounded-lg bg-amber-200 text-black">🖼</span><span class="text-[.6875rem] text-zinc-300">Click to Upload or Drag and Drop</span><span class="text-[.625rem] text-zinc-500">JPG, PNG (Max 3 images up to 5MB)</span><input type="file" accept="image/jpeg,image/png" multiple class="sr-only" onchange="addPhotos(this)"></label>
 <div id="ph" class="flex gap-2"></div>${err('ph')}
 <label class="flex gap-2 text-[.6875rem] text-zinc-500"><input type="checkbox" name="ack" class="mt-0.5"> I acknowledge that my details and photos will be stored and visible to NIT Calicut administrators.</label>${err('ack')}
 <button class="w-full rounded-lg bg-white text-black text-sm font-medium py-2.5 hover:bg-zinc-200">Submit</button></div></form></section>
 <section class="${pnl}"><h2 class="text-sm font-medium mb-4">My Requests</h2>${mine.length?mine.map(i=>{const [cl,em]=CC[i.cat];return `<a href="#/req/${i.id}" class="flex items-center gap-3 rounded-xl bg-white/[.05] p-3 mb-3 border-r-4 hover:bg-white/10" style="border-color:${cl}"><span class="w-9 h-9 shrink-0 grid place-items-center rounded-lg text-base" style="background:${cl}" aria-hidden="true">${em}</span><span class="flex-1 min-w-0"><span class="block text-sm font-medium truncate">${esc(i.title)}</span><span class="flex items-center gap-1 text-[.6875rem] text-zinc-400">${ic.pin}<span class="truncate">${esc(i.loc)}</span></span><span class="block text-[.625rem] text-zinc-600">${i.id} · ${fd(i.at.slice(0,10))}</span></span>${badge(i.st)}</a>`}).join(''):empty('No requests yet. Submit your first one!')}</section></div></main>`}
