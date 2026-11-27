import { day } from './util.js';

export const USERS = []; // Filled by hydrate()

export const S = {
    me: null,
    issues: [],
    wos: [],
    pu: [],
    notes: [],
    photos: [],
    f: {
        q: '',
        st: '',
        cat: '',
        pr: ''
    },
    wf: {
        q: '',
        st: '',
        pr: '',
        ty: ''
    },
    last: Date.now()
};

export const gi = id => S.issues.find(i => i.id == id);
export const gw = id => S.wos.find(w => w.id == id);
export const WIB = new Map(); // issue_id -> work order
export const wOf = iid => WIB.get(iid);
export const overdue = w =>
    w.dl < day(0) && w.st != 'Resolved';
export const hooks = {
    go: () => {}
}; 
export const ui = {
    edit: null
}; 
