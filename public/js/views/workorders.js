import {act,svc} from '../api.js';
import {PRI} from '../config.js';
import {S,gw,overdue} from '../state.js';
import {badge,btn,btn2,card,empty,inp,kv,lbl,page,row} from '../ui.js';
import {day,esc,fd,fmt} from '../util.js';

export function wos(){const f=S.wf;
 return page('Work Orders',`<div class="grid sm:grid-cols-4 gap-2 mb-4"><input aria-label="Search by work-order ID, issue ID, details or assignee" placeholder="Search ID, issue or assignee" value="${esc(f.q)}" oninput="S.wf.q=this.value;wolst()" class="${inp}">
 <select aria-label="Status" onchange="S.wf.st=this.value;wolst()" class="${inp}"><option value="">All statuses</option>${['Assigned','Resolved','Overdue'].map(s=>`<option ${f.st==s?'selected':''}>${s}</option>`).join('')}</select>
 <select aria-label="Priority" onchange="S.wf.pr=this.value;wolst()" class="${inp}"><option value="">Any priority</option>${PRI.map(s=>`<option ${f.pr==s?'selected':''}>${s}</option>`).join('')}</select>
 <select aria-label="Assignment type" onchange="S.wf.ty=this.value;wolst()" class="${inp}"><option value="">Any type</option>${['Internal','External'].map(s=>`<option ${f.ty==s?'selected':''}>${s}</option>`).join('')}</select></div><div id="wol" class="${card}"></div>`)}
export const woRow=w=>row('wo/'+w.id,w.id,esc(w.details),esc(w.who||'Unassigned')+' · '+w.pr+' · due '+fd(w.dl),overdue(w)?'<span class="px-2.5 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300">Overdue</span>':badge(w.st=='Resolved'?'Resolved':'In-Progress'));
export function wolst(){const f=S.wf,q=f.q.toLowerCase(),r=S.wos.slice().reverse().filter(w=>(!q||w.id.toLowerCase().includes(q)||w.iid.toLowerCase().includes(q)||w.details.toLowerCase().includes(q)||(w.who||'').toLowerCase().includes(q))
 &&(!f.st||(f.st=='Overdue'?overdue(w):w.st==f.st))&&(!f.pr||w.pr==f.pr)&&(!f.ty||w.type==f.ty));
 document.getElementById('wol').innerHTML=r.length?r.map(woRow).join(''):empty('No work orders match these filters.')}
export function woDetail(id){const w=gw(id);if(!w)return page('Not found','');const pu=S.pu.filter(p=>p.wo==id).reverse();
 return page(`${w.id} · ${w.iid}`,`<div class="grid lg:grid-cols-2 gap-5"><section class="${card} space-y-2 text-sm">${kv('Status',w.st+(overdue(w)?' · <span class="text-rose-400">overdue</span>':''))}${kv('Details',esc(w.details))}${kv('Type',w.type)}${kv('Assignee',esc(w.who||'—'))}${kv('Priority',w.pr)}${kv('Deadline',fd(w.dl))}${w.note?kv('Resolution',esc(w.note)):''}<a class="${btn2} inline-block mt-2" href="#/issue/${w.iid}">View issue</a>
 <h3 class="font-medium pt-3">Progress updates</h3>${pu.length?pu.map(p=>`<div class="border-l-2 border-violet-400/50 pl-3 mb-2">${esc(p.d)}<div class="text-xs text-zinc-500">${fmt(p.at)}</div></div>`).join(''):empty('None yet.')}</section>
 ${w.st=='Assigned'?`<form onsubmit="return upWO(event,'${w.id}')" class="${card} space-y-3"><h2 class="font-semibold">Update Work Order</h2><p class="text-xs text-amber-300/90">Contact maintenance by phone first, then record the confirmed details here.</p>
 ${lbl('Work details','<textarea name="details" rows="3" class="'+inp+'">'+esc(w.details)+'</textarea>')}
 <div class="grid grid-cols-2 gap-3"><div>${lbl('Priority','<select name="pr" class="'+inp+'">'+PRI.map(p=>`<option ${p==w.pr?'selected':''}>${p}</option>`).join('')+'</select>')}</div><div>${lbl('Target date','<input type="date" name="dl" min="'+(w.dl<day(0)?w.dl:day(0))+'" value="'+w.dl+'" class="'+inp+'">')}</div></div>
 ${lbl('Assignee name','<input name="who" value="'+esc(w.who||'')+'" class="'+inp+'">')}${lbl('Add progress update','<textarea name="p" rows="3" class="'+inp+'"></textarea>')}<button class="${btn}">Save update</button></form>`:`<div class="${card} text-sm text-zinc-400">Resolved work orders are final and cannot be edited.</div>`}</div>`)}
export const upWO=(e,id)=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));act(()=>svc.updateWO(id,f),'Work order updated');return false};
