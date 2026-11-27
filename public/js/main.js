import { act, api, hydrate, svc } from './api.js';
import { go } from './router.js';
import { S, hooks } from './state.js';
import { toast } from './ui.js';

import { doLogin, logout } from './views/auth.js';
import { cl, lst, mkWO } from './views/issues.js';
import { addPhotos, submitIssue } from './views/user.js';
import { cancelEdit, editUser, saveUser } from './views/users.js';
import { upWO, wolst } from './views/workorders.js';

Object.assign(window, {
    S,
    api,
    svc,
    act,
    go,
    lst,
    wolst,
    doLogin,
    logout,
    addPhotos,
    submitIssue,
    mkWO,
    cl,
    upWO,
    saveUser,
    editUser,
    cancelEdit
});

hooks.go = go;
window.onhashchange = go;

['click', 'keydown'].forEach(e =>
    document.addEventListener(e, () => S.last = Date.now())
);

setInterval(() => {
    if (S.me && Date.now() - S.last > 30 * 60 * 1000) {
        logout();
        toast('Session expired after 30 minutes of inactivity. Please log in again.', 1);
    }
}, 20000);

(async () => {
    try {
        const r = await api('GET', '/api/me');

        S.me = {
            id: r.user.user_id,
            name: r.user.name,
            role: r.user.role == 'ADMINISTRATOR' ? 'A' : 'U'
        };

        await hydrate();
    } catch {}

    go();
})();
