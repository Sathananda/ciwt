import {esc} from './util.js';

export function toast(m,e){const t=document.getElementById('toast');t.innerHTML=`<div role="status" class="px-4 py-2 rounded-xl text-sm shadow-lg ${e?'bg-rose-500/20 text-rose-200 border border-rose-400/40':'bg-cyan-500/20 text-cyan-100 border border-cyan-400/40'} backdrop-blur">${esc(m)}</div>`;clearTimeout(toast.t);toast.t=setTimeout(()=>t.innerHTML='',3500)}
export const BC={Open:'bg-indigo-400 text-black','In-Progress':'bg-purple-400 text-black',Resolved:'bg-cyan-400 text-black',Closed:'bg-rose-400 text-black'};
export const badge=s=>`<span class="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${BC[s]}">${s}</span>`;
export const card='bg-[#0a0a0a] border border-white/10 rounded-2xl p-5',inp='w-full rounded-xl bg-white/[.04] border border-white/10 px-3 py-2 text-sm',
 btn='g text-black font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90',btn2='border border-white/15 rounded-xl px-4 py-2 text-sm hover:bg-white/5';
export const lbl=(t,x)=>`<label class="block text-sm text-zinc-300 mb-1">${t}</label>${x}`;
export const err=n=>`<p id="e-${n}" class="text-rose-400 text-xs mt-1" role="alert"></p>`;
export const empty=t=>`<p class="text-zinc-500 text-sm py-8 text-center">${t}</p>`;
export const row=(href,a,b,c,d)=>`<a href="#/${href}" class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-3 hover:bg-white/5 border border-white/5 mb-2"><span class="text-xs text-zinc-400 w-16">${a}</span><span class="flex-1 min-w-[40%] text-sm font-medium">${b}</span><span class="text-xs text-zinc-400 w-full sm:w-auto">${c}</span>${d}</a>`;
export const page=(t,b)=>`<main class="max-w-6xl mx-auto px-4 py-6"><h1 class="text-2xl font-semibold mb-5">${t}</h1>${b}</main>`;
export const kv=(k,v)=>`<div class="flex gap-3"><span class="text-zinc-500 w-28 shrink-0">${k}</span><span>${v}</span></div>`;
export const photos=i=>i.photos?.length?`<div class="flex gap-2 pt-2">${i.photos.map(p=>`<img src="${p.url}" alt="${esc(p.name)}" class="w-20 h-20 object-cover rounded-lg">`).join('')}</div>`:'';
export const sv=p=>`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${p}</svg>`;
export const ic={users:sv('<path d="M9 11a4 4 0 100-8 4 4 0 000 8zm7 1a3 3 0 100-6 3 3 0 000 6zM2 20a7 7 0 0114 0zm15 0a5 5 0 00-2.001-4A5 5 0 0117 20z"/>'),logo:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/></svg>',home:sv('<path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z"/>'),list:sv('<path d="M4 5h16v3H4zM4 10.5h16v3H4zM4 16h16v3H4z"/>'),tool:sv('<path d="M5 4h14v16H5zM8 8h8v2H8zm0 4h8v2H8z"/>'),bell:sv('<path d="M12 22a2.5 2.5 0 002.4-2h-4.8A2.5 2.5 0 0012 22zm7-5v-6a7 7 0 10-14 0v6l-2 2v1h18v-1z"/>'),pin:sv('<path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/>'),warn:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3l10 18H2z"/></svg>'};
export const CC={Electrical:['#fb7185','⚡'],Plumbing:['#818cf8','💧'],Furniture:['#c084fc','🪑'],Cleaning:['#fbbf24','🧹'],Network:['#22d3ee','📶'],Others:['#a78bfa','🛠']};
export const pnl=card,inp2='w-full rounded-lg bg-white/[.04] border border-white/10 px-3 py-2 text-xs placeholder-zinc-600';
export const fld=(t,x)=>`<label class="block text-xs text-zinc-300 mb-1.5">${t} <span class="text-rose-400">*</span></label>${x}`;
export const welcome=(n,s)=>`<h1 class="text-3xl font-semibold mt-8">Welcome back, <span class="text-[#e879f9]">${esc(n)}</span></h1><p class="text-xs text-zinc-500 mt-1 mb-7">${s}</p>`;
