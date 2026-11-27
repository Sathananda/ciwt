import { nav } from './components/nav.js';
import { S } from './state.js';

import { login } from './views/auth.js';
import { dash } from './views/dashboard.js';
import { issueDetail, issues, lst } from './views/issues.js';
import { notes, reqDetail, userHome } from './views/user.js';
import { users } from './views/users.js';
import { woDetail, wolst, wos } from './views/workorders.js';

export function go() {
    const [r, a] = location.hash.slice(2).split('/');
    const app = document.getElementById('app');

    if (!S.me) {
        if (r != 'login') {
            location.hash = '#/login';
        }

        app.innerHTML = login();
        return;
    }

    const A = S.me.role == 'A';

    const ar = ['dash', 'issues', 'issue', 'wos', 'wo', 'users'];
    const ur = ['home', 'req', 'notes'];

    if (A ? !ar.includes(r) : !ur.includes(r)) {
        location.hash = A ? '#/dash' : '#/home';
        return;
    }

    const v = {
        dash,
        issues,
        issue: () => issueDetail(a),
        wos,
        wo: () => woDetail(a),
        users,
        home: userHome,
        req: () => reqDetail(a),
        notes
    }[r]();

    app.innerHTML = nav() + v;

    if (r == 'issues') lst();
    if (r == 'wos') wolst();

    window.scrollTo(0, 0);
}
