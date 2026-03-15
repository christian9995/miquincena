'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface GoogleAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { email: string; name: string; picture?: string } | null;
  accessToken: string | null;
  isSyncing: boolean;
  syncStatus: 'synced' | 'pending' | 'error' | 'offline';
  lastSyncTime: number | null;
  isOnline: boolean;
  hasPendingSync: boolean;
  signIn: (credentialResponse: any) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  updateSyncStatus: (isSyncing: boolean, status?: 'synced' | 'pending' | 'error') => void;
  triggerPendingSync: () => Promise<void>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string; picture?: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error' | 'offline'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[v0] Connection restored');
      setIsOnline(true);
      setSyncStatus('pending');
      setHasPendingSync(true);
    };

    const handleOffline = () => {
      console.log('[v0] Connection lost');
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem('google_access_token');
        const storedUser = localStorage.getItem('google_user');
        const storedSyncTime = localStorage.getItem('google_last_sync');
        const pendingSync = localStorage.getItem('google_pending_sync');
        
        if (storedToken && storedUser) {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
          if (storedSyncTime) {
            setLastSyncTime(parseInt(storedSyncTime));
          }
          if (pendingSync === 'true') {
            setHasPendingSync(true);
            setSyncStatus('pending');
          } else {
            setSyncStatus('synced');
          }
        }
      } catch (err) {
        console.error('[v0] Error checking auth:', err);
        setError('Failed to restore authentication');
      }
    };

    checkAuth();
  }, []);

  const signIn = useCallback(async (credentialResponse: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Decode JWT to get user info
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const decoded = JSON.parse(jsonPayload);
      
      // Store tokens and user info
      localStorage.setItem('google_access_token', credentialResponse.credential);
      localStorage.setItem('google_user', JSON.stringify({
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      }));
      
      setAccessToken(credentialResponse.credential);
      setUser({
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      });
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('[v0] Credential response error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Clear auth tokens and user data
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_user');
      localStorage.removeItem('google_refresh_token');
      localStorage.removeItem('google_last_sync');
      
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
      setLastSyncTime(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      console.error('[v0] Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSyncStatus = useCallback((syncing: boolean, status?: 'synced' | 'pending' | 'error') => {
    setIsSyncing(syncing);
    
    if (!syncing) {
      const newStatus = status || (isOnline ? 'synced' : 'pending');
      setSyncStatus(newStatus);
      
      if (newStatus === 'synced') {
        const now = Date.now();
        setLastSyncTime(now);
        localStorage.setItem('google_last_sync', now.toString());
        localStorage.setItem('google_pending_sync', 'false');
        setHasPendingSync(false);
      } else if (newStatus === 'pending') {
        localStorage.setItem('google_pending_sync', 'true');
        setHasPendingSync(true);
      }
    }
  }, [isOnline]);

  const triggerPendingSync = useCallback(async () => {
    console.log('[v0] Triggering pending sync');
    // This will be called by useFinance when connection is restored
    // The actual sync logic is handled by the sync manager
    setHasPendingSync(false);
  }, []);

  return (
    <GoogleAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        accessToken,
        signIn,
        signOut,
        error,
        isSyncing,
        syncStatus,
        lastSyncTime,
        isOnline,
        hasPendingSync,
        updateSyncStatus,
        triggerPendingSync,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within GoogleAuthProvider');
  }
  return context;
};
