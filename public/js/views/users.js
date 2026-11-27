import {act,svc} from '../api.js';
import {S,USERS,hooks,ui} from '../state.js';
import {btn,btn2,empty,err,fld,inp2,lbl,page,pnl} from '../ui.js';
import {esc} from '../util.js';

export function users(){const l=USERS.slice().sort((a,b)=>a.name.localeCompare(b.name)),ed=ui.edit?USERS.find(u=>u.id==ui.edit):null;
 return page('Users',`<div class="grid lg:grid-cols-[1fr_1.6fr] gap-6"><section class="${pnl}"><h2 class="text-sm font-medium mb-4">${ed?'Edit User':'Add User'}</h2>
 <form onsubmit="return saveUser(event)" novalidate class="space-y-3"><div>${fld('Full name','<input name="name" maxlength="100" placeholder="Full name" value="'+esc(ed?.name||'')+'" class="'+inp2+'">')}${err('uname')}</div>
 <div>${fld('Email','<input name="email" type="email" autocomplete="off" placeholder="name@nitc.ac.in" value="'+esc(ed?.email||'')+'" class="'+inp2+'">')}${err('uemail')}</div>
 <div>${(ed?'<label class="block text-xs text-zinc-300 mb-1.5">New password (leave blank to keep)</label>':fld('Password',''))}<input name="pw" type="password" minlength="8" autocomplete="new-password" placeholder="'+(ed?'Unchanged':'At least 8 characters')+'" class="'+inp2+'">${err('upw')}</div>
 <div>${lbl('Role','<select name="role" class="'+inp2+'"><option'+(ed&&ed.role=='END_USER'?' selected':'')+'>End user</option><option'+(ed&&ed.role=='ADMINISTRATOR'?' selected':'')+'>Administrator</option></select>')}</div>
 <div class="flex gap-2"><button class="${btn} flex-1">${ed?'Save Changes':'Add User'}</button>${ed?`<button type="button" onclick="cancelEdit()" class="${btn2}">Cancel</button>`:''}</div></form></section>
 <section class="${pnl}"><h2 class="text-sm font-medium mb-4">All Users (${l.length})</h2>${l.length?l.map(u=>`<div class="flex items-center gap-3 rounded-xl bg-white/[.04] px-3 py-2.5 mb-2"><span class="w-8 h-8 shrink-0 grid place-items-center rounded-full border border-white/20 text-xs" aria-hidden="true">${esc((u.name||'?')[0])}</span><span class="flex-1 min-w-0"><span class="block text-sm font-medium truncate">${esc(u.name)}</span><span class="block text-[.6875rem] text-zinc-500 truncate">${esc(u.email||'')}</span></span><span class="px-2 py-0.5 rounded-full text-[.625rem] ${u.role=='ADMINISTRATOR'?'bg-violet-400 text-black':'bg-white/10 text-zinc-300'}">${u.role=='ADMINISTRATOR'?'Admin':'End user'}</span><button type="button" onclick="editUser('${u.id}')" aria-label="Edit ${esc(u.name)}" class="text-[.6875rem] text-zinc-400 hover:text-white px-2 py-1 rounded">Edit</button></div>`).join(''):empty('No users yet.')}</section></div>`)}
export function saveUser(e){e.preventDefault();const f=new FormData(e.target),v=k=>(f.get(k)||'').toString().trim(),ed=ui.edit?USERS.find(u=>u.id==ui.edit):null,E={};
 if(!v('name')||v('name').length>100)E.uname='Name: enter 1–100 characters.';
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email')))E.uemail='Email: enter a valid email address.';
 if((!ed||v('pw'))&&v('pw').length<8)E.upw='Password: use at least 8 characters.';
 ['uname','uemail','upw'].forEach(k=>document.getElementById('e-'+k).textContent=E[k]||'');
 if(Object.keys(E).length)return false;
 act(async()=>{const d={name:v('name'),email:v('email'),pw:v('pw'),role:v('role')};
  if(ed){await svc.updateUser(ed.id,d);if(ed.id==S.me.id)S.me.name=d.name}else await svc.addUser(d);
  ui.edit=null},ed?'User updated':'User added');return false}
export const editUser=id=>{ui.edit=id;hooks.go()};
export const cancelEdit=()=>{ui.edit=null;hooks.go()};
