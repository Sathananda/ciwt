import { CT, ST } from './config.js';
import { S, USERS, WIB, hooks } from './state.js';
import { toast } from './ui.js';

export const api = async (m, u, b) => {
    const o = {
        method: m,
        credentials: 'same-origin'
    };

    if (b instanceof FormData) {
        o.body = b;
    } else if (b) {
        o.headers = {
            'content-type': 'application/json'
        };

        o.body = JSON.stringify(b);
    }

    const r = await fetch(u, o);
    const j = await r.json().catch(() => ({}));

    if (r.status == 401 && S.me) {
        S.me = null;
        location.hash = '#/login';
        hooks.go();

        throw new Error('Session expired. Please log in again.');
    }

    if (!r.ok) {
        throw new Error(j.error || 'Request failed');
    }

    return j;
};


export async function hydrate() {
    const d = await api('GET', '/api/bootstrap');

    USERS.length = 0;

    USERS.push(
        ...d.users.map(u => ({
            id: u.user_id,
            name: u.name,
            email: u.email,
            role: u.role
        }))
    );

    const ph = {};

    for (const p of d.photos) {
        (ph[p.issue_id] ??= []).push({
            name: p.file_name,
            url: '/api/photos/' + p.photo_id
        });
    }

    S.issues = d.issues.map(i => ({
        id: i.issue_id,
        uid: i.user_id,
        title: i.title,
        cat: CT(i.category),
        loc: i.location,
        desc: i.description,
        st: ST[i.status],
        fb: i.closure_feedback,
        at: i.submitted_at,
        photos: ph[i.issue_id] ?? []
    }));

    S.wos = d.workOrders.map(w => ({
        id: w.work_order_id,
        iid: w.issue_id,
        details: w.work_details,
        type: CT(w.assignment_type),
        who: w.assigned_person_name,
        pr: CT(w.priority),
        dl: w.deadline,
        st: CT(w.status),
        note: w.resolution_note,
        at: w.created_at
    }));

    WIB.clear();

    S.wos.forEach(w => WIB.set(w.iid, w));

    S.pu = d.updates.map(p => ({
        wo: p.work_order_id,
        d: p.description,
        at: p.updated_at
    }));

    S.notes = d.notifications.map(n => ({
        id: n.notification_id,
        uid: S.me.id,
        iid: n.issue_id,
        m: n.message,
        read: n.is_read,
        at: n.created_at
    }));
}


export const svc = {
    async create(d) {
        const f = new FormData();

        f.set('title', d.title);
        f.set('category', d.cat.toUpperCase());
        f.set('location', d.loc);
        f.set('description', d.desc);
        f.set('ack', 'true');

        S.photos.forEach(p => f.append('photos', p.file));

        const r = await api('POST', '/api/issues', f);

        await hydrate();

        return {
            id: r.issue.issue_id
        };
    },

    async close(id, fb) {
        await api('POST', `/api/issues/${id}/close`, {
            feedback: fb
        });

        await hydrate();
    },

    async createWO(id, d) {
        await api('POST', `/api/issues/${id}/work-order`, {
            work_details: d.details,
            assignment_type: d.type.toUpperCase(),
            assigned_person_name: d.who.trim() || undefined,
            priority: d.pr.toUpperCase(),
            deadline: d.dl
        });

        await hydrate();
    },

    async updateWO(id, d) {
        await api('PATCH', '/api/work-orders/' + id, {
            work_details: d.details.trim(),
            priority: d.pr.toUpperCase(),
            deadline: d.dl,
            assigned_person_name: d.who.trim(),
            progress: d.p.trim() || undefined
        });

        await hydrate();
    },

    async resolve(id) {
        await api('POST', `/api/issues/${id}/resolve`);

        await hydrate();
    },

    async addUser(d) {
        const r = await api('POST', '/api/users', {
            name: d.name,
            email: d.email,
            password: d.pw,
            role: d.role == 'Administrator'
                ? 'ADMINISTRATOR'
                : 'END_USER'
        });

        await hydrate();

        return r.user;
    },

    async updateUser(id, d) {
        await api('PATCH', '/api/users/' + id, {
            name: d.name,
            email: d.email,
            password: d.pw || undefined,
            role: d.role == 'Administrator'
                ? 'ADMINISTRATOR'
                : 'END_USER'
        });

        await hydrate();
    }
};


export const act = async (fn, ok) => {
    try {
        await fn();

        if (ok) {
            toast(ok);
        }

        hooks.go();
    } catch (e) {
        toast(e.message, 1);
    }
};
