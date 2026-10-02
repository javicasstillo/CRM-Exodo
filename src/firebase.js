import { initializeApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// ── Auth ──────────────────────────────────────────────────
export const login  = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

// ── Registro de usuario (solo admin puede crear vendedores) ──
export const registerUser = async ({ email, password, name, role, businessId }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, 'users', cred.user.uid), {
    name, email, role, businessId,
    createdAt: serverTimestamp(),
    active: true,
  });
  return cred.user;
};

// ── Perfil de usuario ─────────────────────────────────────
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), data);
  if (data.name) await updateProfile(auth.currentUser, { displayName: data.name });
};

// ── Configuración del negocio ─────────────────────────────
export const getBusinessConfig = async (businessId) => {
  const snap = await getDoc(doc(db, 'businesses', businessId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const saveBusinessConfig = async (businessId, data) => {
  await setDoc(doc(db, 'businesses', businessId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

// ── Invitaciones ──────────────────────────────────────────
export const createInvitation = async ({ email, role, businessId, businessName }) => {
  const code = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  await setDoc(doc(db, 'invitations', code), {
    email, role, businessId, businessName,
    used: false,
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
  });
  return code;
};

export const getInvitation = async (code) => {
  const snap = await getDoc(doc(db, 'invitations', code));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const markInvitationUsed = async (code) => {
  await updateDoc(doc(db, 'invitations', code), { used: true });
};

export const registerWithInvitation = async ({ code, name, password }) => {
  const inv = await getInvitation(code);
  if (!inv) throw new Error('Invitación inválida');
  if (inv.used) throw new Error('Esta invitación ya fue usada');
  if (new Date() > inv.expiresAt.toDate()) throw new Error('La invitación expiró');

  const cred = await createUserWithEmailAndPassword(auth, inv.email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, 'users', cred.user.uid), {
    name, email: inv.email,
    role: inv.role,
    businessId: inv.businessId,
    createdAt: serverTimestamp(),
    active: true,
  });
  await markInvitationUsed(code);
  return cred.user;
};