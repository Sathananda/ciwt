import {day} from './util.js';

export const USERS=[];   // filled by hydrate()
export const S={me:null,issues:[],wos:[],pu:[],notes:[],photos:[],f:{q:'',st:'',cat:'',pr:''},wf:{q:'',st:'',pr:'',ty:''},last:Date.now()};
export const gi=id=>S.issues.find(i=>i.id==id),gw=id=>S.wos.find(w=>w.id==id);
export const WIB=new Map();   // issue_id -> work order, rebuilt on hydrate (avoids a linear scan per issue)
export const wOf=iid=>WIB.get(iid);
export const overdue=w=>w.dl<day(0)&&w.st!='Resolved';
export const hooks={go:()=>{}};   // set by main.js so low-level modules can re-render without importing the router
export const ui={edit:null};   // user_id being edited on the Users page

