import { act, svc } from '../api.js';
import { CATS, PRI } from '../config.js';
import { S, USERS, gi, wOf } from '../state.js';
import { badge, btn, btn2, card, empty, inp, kv, lbl, page, photos, row } from '../ui.js';
import { day, esc, fmt } from '../util.js';

export function issues() {
  const f = S.f;

  return page(
    'Issues',
    `<div class="grid sm:grid-cols-4 gap-2 mb-4">
      <input
        aria-label="Search by ID or title"
        placeholder="Search ID or title"
        value="${esc(f.q)}"
        oninput="S.f.q=this.value;lst()"
        class="${inp}"
      >
      <select aria-label="Status" onchange="S.f.st=this.value;lst()" class="${inp}">
        <option value="">All statuses</option>
        ${['Open', 'In-Progress', 'Resolved', 'Closed']
          .map((s) => `<option ${f.st == s ? 'selected' : ''}>${s}</option>`)
          .join('')}
      </select>
      <select aria-label="Category" onchange="S.f.cat=this.value;lst()" class="${inp}">
        <option value="">All categories</option>
        ${CATS.map((s) => `<option ${f.cat == s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <select aria-label="Priority" onchange="S.f.pr=this.value;lst()" class="${inp}">
        <option value="">Any priority</option>
        ${PRI.map((s) => `<option ${f.pr == s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div id="lst" class="${card}"></div>`
  );
}

export function lst() {
  const f = S.f;
  const q = f.q.toLowerCase();
  const r = S.issues.filter(
    (i) =>
      (!q || i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q)) &&
      (!f.st || i.st == f.st) &&
      (!f.cat || i.cat == f.cat) &&
      (!f.pr || wOf(i.id)?.pr == f.pr)
  );

  document.getElementById('lst').innerHTML = r.length
    ? r.map((i) => row('issue/' + i.id, i.id, esc(i.title), esc(i.loc) + ' · ' + i.cat, badge(i.st))).join('')
    : empty('No issues match these filters.');
}

export function issueDetail(id) {
  const i = gi(id);
  if (!i) return page('Not found', '');

  const w = wOf(id);
  const u = USERS.find((u) => u.id == i.uid);

  const woForm =
    i.st == 'Open'
      ? `<div class="space-y-5">
          <form onsubmit="return mkWO(event,'${i.id}')" class="${card} space-y-3">
            <h2 class="font-semibold">Create Work Order</h2>
            <p class="text-xs text-amber-300/90">Contact maintenance by phone first, then record the confirmed details here.</p>
            <div>${lbl('Work details *', '<textarea name="details" rows="3" class="' + inp + '"></textarea>')}</div>
            <div class="grid grid-cols-2 gap-3">
              <div>${lbl('Assignment type', '<select name="type" class="' + inp + '"><option>Internal</option><option>External</option></select>')}</div>
              <div>${lbl('Priority', '<select name="pr" class="' + inp + '">' + PRI.map((p) => `<option ${p == 'Medium' ? 'selected' : ''}>${p}</option>`).join('') + '</select>')}</div>
              <div>${lbl('Assignee name (optional)', '<input name="who" class="' + inp + '">')}</div>
              <div>${lbl('Target date *', '<input type="date" name="dl" min="' + day(0) + '" class="' + inp + '">')}</div>
            </div>
            <button class="${btn}">Create Work Order</button>
          </form>
          <form onsubmit="return cl(event,'${i.id}')" class="${card} space-y-3">
            <h2 class="font-semibold">Close Issue</h2>
            ${lbl('Feedback (optional)', '<textarea name="fb" rows="2" class="' + inp + '"></textarea>')}
            <button class="${btn2}">Close Issue</button>
          </form>
        </div>`
      : '';

  return page(
    `${i.id} · ${esc(i.title)}`,
    `<div class="grid lg:grid-cols-2 gap-5">
      <section class="${card} space-y-2 text-sm">
        ${badge(i.st)}
        ${kv('Submitted by', esc(u.name))}
        ${kv('Category', i.cat)}
        ${kv('Location', esc(i.loc))}
        ${kv('Submitted', fmt(i.at))}
        <p class="text-zinc-300 pt-2">${esc(i.desc)}</p>
        ${photos(i)}
        ${i.fb ? `<p class="p-3 rounded-xl bg-rose-500/10 text-rose-200">Feedback sent: ${esc(i.fb)}</p>` : ''}
        ${w ? `<a class="${btn2} inline-block mt-2" href="#/wo/${w.id}">Open ${w.id}</a>` : ''}
      </section>
      ${woForm}
    </div>`
  );
}

export const mkWO = (e, id) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  act(
    () => svc.createWO(id, { details: f.details, type: f.type, who: f.who, pr: f.pr, dl: f.dl }),
    'Work order created'
  );
  return false;
};

export const cl = (e, id) => {
  e.preventDefault();
  if (confirm('Close this issue? This is final.')) {
    act(() => svc.close(id, new FormData(e.target).get('fb')), 'Issue closed');
  }
  return false;
};
