import { createContext, useContext, useState, useEffect } from 'react';
import { getUserProfile, getBusinessConfig, saveBusinessConfig } from '../firebase';
import { setBusinessId } from '../api';
import { getFunctions, httpsCallable } from 'firebase/functions';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ user, children }) {
  const [profile, setProfile]             = useState(null);
  const [business, setBusiness]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [subStatus, setSubStatus]         = useState(null);
  const [trialDays, setTrialDays]         = useState(null);
  const [isNewBusiness, setIsNewBusiness] = useState(false);

  // ── Sucursales ──────────────────────────────────────────────────────
  const [branches, setBranches]               = useState([]); // lista de sucursales del maestro
  const [activeBranchId, setActiveBranchId]   = useState(null); // null = negocio maestro
  const [activeBusiness, setActiveBusiness]   = useState(null); // negocio activo (maestro o sucursal)

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
          onboardingCompleted: false,
        });
      }

      setProfile(prof);

      if (prof.active === false) {
        const { logout } = await import('../firebase');
        await logout();
        return;
      }

      setBusinessId(prof.businessId);

      const biz = await getBusinessConfig(prof.businessId);
      setBusiness(biz);
      setActiveBusiness(biz);

      if (biz?.onboardingCompleted !== true) {
        setIsNewBusiness(true);
      }

      // Cargar sucursales si es plan Empresa
      if (biz?.plan === 'empresa' && biz?.branches?.length > 0) {
        setBranches(biz.branches);
      }

      try {
        const functions = getFunctions(undefined, 'us-central1');
        const getStatus = httpsCallable(functions, 'getBusinessStatus');
        const result = await getStatus();
        setSubStatus(result.data.status);
        setTrialDays(result.data.trialDaysLeft);
      } catch (e) {
        setSubStatus(biz?.status || 'trial');
        setTrialDays(null);
      }

    } catch (e) {
      console.error('Error cargando perfil:', e);
    } finally {
      setLoading(false);
    }
  };

  // Cambiar de sucursal — actualiza el businessId activo en el api
  const switchBranch = async (branchId) => {
    if (branchId === null) {
      // Volver al negocio maestro
      setActiveBranchId(null);
      setActiveBusiness(business);
      setBusinessId(profile.businessId);
    } else {
      // Cambiar a una sucursal
      const branchBiz = await getBusinessConfig(branchId);
      setActiveBranchId(branchId);
      setActiveBusiness(branchBiz);
      setBusinessId(branchId);
    }
  };

  const refreshBusiness = async () => {
    if (!profile) return;
    const biz = await getBusinessConfig(profile.businessId);
    setBusiness(biz);
    if (!activeBranchId) setActiveBusiness(biz);
    if (biz?.branches?.length > 0) setBranches(biz.branches);
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
      isNewBusiness, setIsNewBusiness,
      refreshBusiness, refreshProfile,
      // Sucursales
      branches, activeBranchId, activeBusiness,
      switchBranch,
      isMasterViewing: activeBranchId !== null, // true cuando el maestro está viendo una sucursal
    }}>
      {children}
    </AppContext.Provider>
  );
}
