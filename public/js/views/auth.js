import { api, hydrate } from '../api.js';
import { S, hooks } from '../state.js';
import { ic } from '../ui.js';

export function login() {
  const f =
    'w-full rounded-xl bg-black/40 border border-white/10 pl-10 pr-3 py-2.5 text-sm placeholder-zinc-600 focus:border-violet-400';
  const logo =
    '<span class="inline-flex items-center gap-2 font-bold tracking-wider">' +
    ic.logo +
    'RESOLVE</span>';
  const chip = (t) =>
    `<li class="flex items-center gap-3 text-sm text-zinc-300"><span class="w-6 h-6 grid place-items-center rounded-full g text-black text-xs font-bold" aria-hidden="true">✓</span>${t}</li>`;

  return `<div class="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
    <div class="pointer-events-none absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-25" style="background:#a78bfa"></div>
    <div class="pointer-events-none absolute -bottom-48 -right-32 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-20" style="background:#f0abfc"></div>
    <section class="hidden lg:flex flex-col justify-center px-16 relative">
      <div class="mb-10 text-lg">${logo}</div>
      <h1 class="text-5xl font-semibold leading-tight">Report it.<br>Track it.<br><span class="gt">Resolve it.</span></h1>
      <p class="text-zinc-400 mt-5 max-w-md">Fixing today's problems before they become tomorrow's disasters. One place for campus infrastructure issues and the work that fixes them.</p>
      <ul class="mt-8 space-y-3">
        ${chip('Report a fault in under a minute')}
        ${chip('Follow every work order to completion')}
        ${chip('Always see the latest status and progress')}
      </ul>
    </section>
    <section class="flex items-center justify-center p-6 relative">
      <form onsubmit="return doLogin(event)" class="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[.04] backdrop-blur-xl p-8 space-y-5 shadow-2xl shadow-violet-500/10">
        <div class="lg:hidden text-center">${logo}</div>
        <div>
          <h2 class="text-2xl font-semibold">Welcome back</h2>
          <p class="text-sm text-zinc-500 mt-1">Log in to continue to Resolve</p>
        </div>
        <div>
          <label for="em" class="block text-xs text-zinc-300 mb-1.5">Email</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true">✉</span>
            <input id="em" name="email" type="email" required autocomplete="username" placeholder="you@nitc.ac.in" class="${f}">
          </div>
        </div>
        <div>
          <label for="pw" class="block text-xs text-zinc-300 mb-1.5">Password</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true">🔒</span>
            <input id="pw" name="pw" type="password" required autocomplete="current-password" placeholder="••••••••" class="${f}">
            <button type="button" aria-label="Show or hide password" onclick="const p=this.previousElementSibling;p.type=p.type=='password'?'text':'password'" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white px-2 py-1 rounded">Show</button>
          </div>
        </div>
        <p id="e-login" class="text-rose-400 text-xs min-h-[1rem]" role="alert"></p>
        <button class="g text-black font-semibold rounded-xl w-full py-2.5 hover:opacity-90">Log in</button>
        <p class="text-center text-[.6875rem] text-zinc-600">NIT Calicut · Campus Infrastructure Issue &amp; Work-Order Tracker</p>
      </form>
    </section>
  </div>`;
}

export async function doLogin(e) {
  e.preventDefault();
  const f = new FormData(e.target);

  try {
    const r = await api('POST', '/api/login', {
      email: f.get('email'),
      password: f.get('pw'),
    });
    S.me = {
      id: r.user.user_id,
      name: r.user.name,
      role: r.user.role == 'ADMINISTRATOR' ? 'A' : 'U',
    };
    S.last = Date.now();
    await hydrate();
    location.hash = S.me.role == 'A' ? '#/dash' : '#/home';
    hooks.go();
  } catch (x) {
    document.getElementById('e-login').textContent = x.message;
  }

  return false;
}

export async function logout() {
  await api('POST', '/api/logout').catch(() => {});
  S.me = null;
  location.hash = '#/login';
  hooks.go();
}
