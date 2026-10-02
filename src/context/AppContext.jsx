import { createContext, useContext, useState, useEffect } from 'react';
import { getUserProfile, getBusinessConfig, saveBusinessConfig } from '../firebase';
import { setBusinessId } from '../api';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ user, children }) {
  const [profile, setProfile]   = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      let prof = await getUserProfile(user.uid);

      // Si no existe el perfil (primer admin), lo creamos automáticamente
      if (!prof) {
        const businessId = user.uid; // el primer usuario ES el negocio
        prof = {
          id: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          role: 'admin',
          businessId,
          active: true,
        };
        // Guardar perfil
        const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        await setDoc(doc(db, 'users', user.uid), { ...prof, createdAt: serverTimestamp() });

        // Crear configuración del negocio
        await saveBusinessConfig(businessId, {
          name: 'Mi Negocio',
          logo: null,
          currency: 'ARS',
          lowStockThreshold: 3,
          phone: '',
          address: '',
          primaryColor: '#0d6efd',
        });
      }

      setProfile(prof);
      setBusinessId(prof.businessId);

      const biz = await getBusinessConfig(prof.businessId);
      setBusiness(biz);
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
    <AppContext.Provider value={{ profile, business, loading, refreshBusiness, refreshProfile }}>
      {children}
    </AppContext.Provider>
  );
}