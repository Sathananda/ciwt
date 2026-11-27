import { CATS } from '../config.js';
import { S, overdue, wOf } from '../state.js';
import { badge, ic, pnl, welcome } from '../ui.js';
import { esc } from '../util.js';

export function dash() {
  const c = (s) => S.issues.filter((i) => i.st == s).length;
  const tot = S.issues.length;
  const od = S.wos.filter(overdue).length;
  const un = S.issues.filter((i) => i.st == 'Open' && !wOf(i.id)).length;
  const ac = c('Open') + c('In-Progress');
  const p2 = (n) => String(n).padStart(2, '0');

  const col = ['#818cf8', '#c084fc', '#fb7185', '#22d3ee', '#f0abfc', '#a78bfa'];
  const cc = CATS.map((k) => S.issues.filter((i) => i.cat == k).length);
  const circLen = 2 * Math.PI * 46;
  let off = 0;

  const seg = cc
    .map((n, k) => {
      const l = (n / (tot || 1)) * circLen;
      const dashLen = Math.max(l - 1.5, 0);
      const gapLen = circLen - dashLen;
      const s = `<circle
        r="46"
        cx="60"
        cy="60"
        fill="none"
        stroke="${col[k]}"
        stroke-width="18"
        stroke-dasharray="${dashLen} ${gapLen}"
        stroke-dashoffset="${-off}"
        transform="rotate(-90 60 60)"
      />`;
      off += l;
      return s;
    })
    .join('');

  const lg = (l, n, cl) =>
    `<div class="flex items-center gap-2 text-xs text-zinc-400 mb-2">
      <span class="w-1.5 h-1.5 rounded-full" style="background:${cl}"></span>
      <span class="w-24">${l}</span>
      <span class="text-zinc-200">${n}</span>
    </div>`;

  const al = (h, n, t, s, cl, bg) =>
    `<a href="${h}" class="flex items-center gap-3 rounded-xl bg-white/[.04] p-3 mb-3 border-r-4" style="border-color:${cl}">
      <span class="w-10 h-10 grid place-items-center rounded-lg text-black" style="background:${bg}">${ic.warn}</span>
      <span>
        <span class="block text-sm font-medium">${n} ${t}</span>
        <span class="block text-[.6875rem] text-zinc-500">${s}</span>
      </span>
    </a>`;

  const G = 'sm:grid-cols-[3.5rem_1.3fr_1.2fr_1fr_5.5rem]';

  const recentRows = S.issues
    .slice()
    .sort((a, b) => (b.at < a.at ? -1 : 1))
    .slice(0, 5)
    .map(
      (i) =>
        `<a href="#/issue/${i.id}" class="grid ${G} gap-x-3 gap-y-1 items-center px-3 py-2.5 rounded-lg hover:bg-white/5 text-xs">
          <span class="text-zinc-400">${i.id}</span>
          <span class="font-medium">${esc(i.title)}</span>
          <span class="text-zinc-400">${esc(i.loc)}</span>
          <span class="text-zinc-400">${i.cat}</span>
          <span>${badge(i.st)}</span>
        </a>`
    )
    .join('');

  return `<main class="max-w-6xl mx-auto px-4 pb-10">
    ${welcome('Admin', "Fixing today's problems before they become tomorrow's disasters!")}

    <div class="grid md:grid-cols-3 gap-8 mb-8">
      <div>
        <div class="text-xs text-zinc-400">Total Issues</div>
        <div class="text-4xl font-medium my-2">${tot}</div>
        ${lg('Open', p2(c('Open')), '#fb7185')}
        ${lg('In-Progress', p2(c('In-Progress')), '#818cf8')}
        ${lg('Resolved', p2(c('Resolved')), '#22d3ee')}
        ${c('Closed') ? lg('Closed', p2(c('Closed')), '#94a3b8') : ''}
      </div>

      <div>
        <div class="text-xs text-zinc-400">Active Issues</div>
        <div class="text-4xl font-medium my-2">${ac}</div>
        <div class="h-3 rounded-full bg-white/10 overflow-hidden" role="img" aria-label="${ac} of ${tot} issues active">
          <div class="h-full rounded-full" style="width:${(ac / (tot || 1)) * 100}%;background:linear-gradient(90deg,#d8b4fe,#f0abfc)"></div>
        </div>
        <div class="text-[.6875rem] text-zinc-500 mt-2">${c('Open')} Open + ${c('In-Progress')} In-Progress</div>
      </div>

      <div>
        <div class="text-xs text-zinc-400 mb-2">Issue By Category</div>
        <div class="flex items-center gap-4">
          <div class="relative w-36 h-36 shrink-0">
            <svg viewBox="0 0 120 120" class="w-full h-full" role="img" aria-label="Issues by category">
              ${seg}
            </svg>
            <div class="absolute inset-0 grid place-items-center text-center leading-tight">
              <span>
                <b class="text-2xl block">${tot}</b>
                <span class="text-[.625rem] text-zinc-500">Issues</span>
              </span>
            </div>
          </div>
          <ul class="text-[.6875rem] text-zinc-400 space-y-1.5 flex-1">
            ${CATS.map(
              (k, j) => `<li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full" style="background:${col[j]}"></span>
                <span class="flex-1">${k}</span>
                <span class="text-zinc-200">${Math.round((cc[j] / (tot || 1)) * 100)}%</span>
              </li>`
            ).join('')}
          </ul>
        </div>
      </div>
    </div>

    <div class="grid lg:grid-cols-[1fr_1.8fr] gap-6">
      <section class="${pnl}">
        <h2 class="text-sm font-medium mb-4">Alerts</h2>
        ${al('#/wos', od, 'Overdue Work-Orders', 'Passed Expected Completion Date', '#ef4444', '#fb7185')}
        ${al('#/issues', un, 'Unassigned Issues', 'Awaiting Administrator Action', '#8b5cf6', '#c084fc')}
      </section>

      <section class="${pnl}">
        <div class="flex justify-between mb-3">
          <h2 class="text-sm font-medium">Recent Issues</h2>
          <a href="#/issues" class="text-[.6875rem] text-zinc-500 hover:text-white">View All →</a>
        </div>
        <div class="hidden ${G} sm:grid gap-3 px-3 pb-2 text-[.625rem] tracking-wider text-zinc-600">
          <span>ID</span>
          <span>TITLE</span>
          <span>LOCATION</span>
          <span>CATEGORY</span>
          <span>STATUS</span>
        </div>
        ${recentRows}
      </section>
    </div>
  </main>`;
}
