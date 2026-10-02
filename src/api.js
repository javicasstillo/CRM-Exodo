import {
  collection, doc,
  addDoc, updateDoc, deleteDoc,
  onSnapshot,
  query, orderBy, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// businessId se setea al iniciar la app
let _businessId = null;
export const setBusinessId = (id) => { _businessId = id; };
export const getBusinessId = () => _businessId;

function makeCollection(name, orderField = 'createdAt', orderDir = 'desc') {
  const col = () => collection(db, name);
  return {
    add: async (data) => {
      const ref = await addDoc(col(), {
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