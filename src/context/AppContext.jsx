import { createContext, useContext, useState, useEffect } from 'react';
import { getUserProfile, getBusinessConfig, saveBusinessConfig } from '../firebase';
import { setBusinessId } from '../api';
import { getFunctions, httpsCallable } from 'firebase/functions';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ user, children }) {
  const [profile, setProfile]       = useState(null);
  const [business, setBusiness]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [subStatus, setSubStatus]   = useState(null); // trial | active | suspended | pending_payment
  const [trialDays, setTrialDays]   = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      let prof = await getUserProfile(user.uid);

      if (!prof) {
        const businessId = user.uid;
        prof = {
          id: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          role: 'admin',
          businessId,
          active: true,
        };
        const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        await setDoc(doc(db, 'users', user.uid), { ...prof, createdAt: serverTimestamp() });
        await saveBusinessConfig(businessId, {
          name: 'Mi Negocio',
          logo: null,
          currency: 'ARS',
          lowStockThreshold: 3,
          phone: '',
          address: '',
          primaryColor: '#0d6efd',
          status: 'trial',
        });
      }

      setProfile(prof);
      // Bloquear usuario desactivado
if (prof.active === false) {
  const { logout } = await import('../firebase');
  await logout();
  return;
}
      setBusinessId(prof.businessId);

      const biz = await getBusinessConfig(prof.businessId);
      setBusiness(biz);

      // Verificar estado de suscripción via Cloud Function
      try {
        const functions = getFunctions(undefined, 'us-central1');
        const getStatus = httpsCallable(functions, 'getBusinessStatus');
        const result = await getStatus();
        setSubStatus(result.data.status);
        setTrialDays(result.data.trialDaysLeft);
      } catch (e) {
        // Si falla la función, leemos el estado directo de Firestore como fallback
        setSubStatus(biz?.status || 'trial');
        setTrialDays(null);
      }

    } catch (e) {
      console.error('Error cargando perfil:', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshBusiness = async () => {
    if (!profile) return;
    const biz = await getBusinessConfig(profile.businessId);
    setBusiness(biz);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const prof = await getUserProfile(user.uid);
    setProfile(prof);
  };

  return (
    <AppContext.Provider value={{
      profile, business, loading,
      subStatus, trialDays,
      refreshBusiness, refreshProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}