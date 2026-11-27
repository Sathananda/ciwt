import {S} from '../state.js';
import {ic} from '../ui.js';
import {esc} from '../util.js';

export function nav(){
 const a=S.me.role=='A',h=location.hash.slice(2).split('/')[0],un=S.notes.filter(n=>n.uid==S.me.id&&!n.read).length,d=new Date();
 const L=a?[['dash','Dashboard',ic.home],['issues','Issues',ic.list],['wos','Work Orders',ic.tool],['users','Users',ic.users]]:[['home','Dashboard',ic.home]];
 const on=r=>r[0]==h||(h=='issue'&&r[0]=='issues')||(h=='wo'&&r[0]=='wos')||(h=='req'&&r[0]=='home');
 const circ='w-8 h-8 grid place-items-center rounded-full border border-white/20 text-xs relative';
 return `<header class="max-w-6xl mx-auto px-4 pt-6 flex flex-wrap items-center gap-4"><a href="#/${a?'dash':'home'}" class="flex items-center gap-2 font-bold tracking-wider text-sm">${ic.logo}RESOLVE</a>
 <nav class="mx-auto flex items-center gap-1 rounded-full bg-white/[.07] p-1">${L.map(r=>`<a href="#/${r[0]}" aria-label="${r[1]}" class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[.6875rem] ${on(r)?'bg-white text-black font-semibold':'text-zinc-400 hover:text-white'}">${r[2]}${on(r)?r[1]:''}</a>`).join('')}</nav>
 <div class="flex items-center gap-3 text-[.6875rem] text-zinc-300"><span class="hidden sm:inline">${d.getDate()} ${d.toLocaleString('en-GB',{month:'long'})}, ${d.getFullYear()}</span>
 ${a?`<span class="${circ}" aria-hidden="true">${ic.bell}</span>`:`<a href="#/notes" aria-label="Notifications, ${un} unread" class="${circ}">${ic.bell}${un?'<span class="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#f0abfc]"></span>':''}</a>`}
 <button onclick="logout()" class="${circ}" title="Log out" aria-label="Log out ${esc(S.me.name)}">${esc(S.me.name[0])}</button></div></header>`}
