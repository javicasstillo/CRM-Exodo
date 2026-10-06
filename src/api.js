import {
  collection, doc,
  addDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot,
  query, orderBy, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

let _businessId = null;
export const setBusinessId = (id) => { _businessId = id; };
export const getBusinessId = () => _businessId;

function makeCollection(name, orderField = 'createdAt', orderDir = 'desc') {
  const col = () => collection(db, name);
  return {
    add: async (data) => {
  const ref = await addDoc(col(), {
    status: 'disponible', // valor por defecto si no viene
    ...data,
    businessId: _businessId,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...data };
},
    update: async (id, data) => {
      await updateDoc(doc(db, name, id), data);
    },
    remove: async (id) => {
      await deleteDoc(doc(db, name, id));
    },
    // ── Leer un doc directo de Firestore (sin depender del estado local) ──
    getOne: async (id) => {
      const snap = await getDoc(doc(db, name, id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },
    subscribe: (cb) => {
      const constraints = [orderBy(orderField, orderDir)];
      if (_businessId) constraints.unshift(where('businessId', '==', _businessId));
      const q = query(col(), ...constraints);
      return onSnapshot(q, (snap) => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    },
  };
}

export const phonesApi   = makeCollection('phones',   'createdAt', 'desc');
export const buyersApi   = makeCollection('buyers',   'name',      'asc');
export const salesApi    = makeCollection('sales',    'createdAt', 'desc');
export const expensesApi = makeCollection('expenses', 'date',      'desc');