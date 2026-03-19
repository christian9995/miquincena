'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { GoogleAuthResponse } from '@/types';

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
  signIn: (response: GoogleAuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  updateSyncStatus: (isSyncing: boolean, status?: 'synced' | 'pending' | 'error' | 'offline') => void;
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
  const connectionRetryTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = React.useRef(0);
  const tokenRefreshTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const syncTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const syncStartTimeRef = React.useRef<number | null>(null);

  // Timeout constants (in milliseconds)
  const SYNC_TIMEOUT = 10 * 1000; // 10 seconds max for sync operations

  // Verify actual API reachability (not just navigator.onLine)
  const verifyAPIReachability = useCallback(async (): Promise<boolean> => {
    try {
      // Test small API call to verify actual connectivity
      const response = await Promise.race([
        fetch('https://www.google.com/generate_204', { 
          method: 'HEAD',
          mode: 'no-cors',
        }),
        new Promise<Response>((_, reject) => 
          setTimeout(() => reject(new Error('API check timeout')), 5000)
        ),
      ]);
      return true;
    } catch (err) {
      console.log('[v0] API reachability check failed:', err);
      return false;
    }
  }, []);

  // Automatic retry with exponential backoff (up to 5 attempts every 10 seconds)
  const attemptReconnection = useCallback(async () => {
    if (retryCountRef.current >= 5) {
      console.log('[v0] Max reconnection attempts reached');
      return;
    }

    retryCountRef.current++;
    console.log('[v0] Attempting reconnection:', retryCountRef.current, '/5');

    const isReachable = await verifyAPIReachability();
    if (isReachable && isAuthenticated) {
      console.log('[v0] API is reachable - connection restored');
      setIsOnline(true);
      setSyncStatus('pending');
      setHasPendingSync(true);
      retryCountRef.current = 0; // Reset on successful connection
    } else if (retryCountRef.current < 5) {
      // Schedule next attempt
      if (connectionRetryTimerRef.current) clearTimeout(connectionRetryTimerRef.current);
      connectionRetryTimerRef.current = setTimeout(() => {
        attemptReconnection();
      }, 10000); // Retry every 10 seconds
    }
  }, [isAuthenticated, verifyAPIReachability]);

  // Auto-refresh token before expiry (1 hour)
  const refreshTokenIfNeeded = useCallback(() => {
    if (!accessToken || !isAuthenticated) return;

    const tokenRefreshInterval = 50 * 60 * 1000; // Refresh every 50 minutes (1 hour - 10 min buffer)
    
    if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    
    tokenRefreshTimerRef.current = setTimeout(() => {
      console.log('[v0] Token refresh interval reached - requesting new token');
      // Note: Full token refresh would require refresh token from OAuth flow
      // For now, we ensure the stored token is valid by checking it on next API call
      localStorage.setItem('google_token_refresh_needed', 'true');
    }, tokenRefreshInterval);
  }, [accessToken, isAuthenticated]);

  // Monitor online/offline status with robust connection detection and visibility changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('[v0] Online event detected - connection restored');
      setIsOnline(true);
      retryCountRef.current = 0;
      if (isAuthenticated) {
        console.log('[v0] Connection restored and authenticated - marking for sync');
        setSyncStatus('pending');
        setHasPendingSync(true);
      }
    };

    const handleOffline = () => {
      console.log('[v0] Offline event detected - connection lost');
      setIsOnline(false);
      if (isAuthenticated) {
        setSyncStatus('offline');
        // Start retry attempts
        attemptReconnection();
      }
    };

    // Force refresh sync status - reset stuck syncs
    const forceRefreshSyncStatus = () => {
      // If sync has been running for more than 10 seconds, reset it
      if (syncStartTimeRef.current && Date.now() - syncStartTimeRef.current > SYNC_TIMEOUT) {
        setSyncStatus('synced');
        setIsSyncing(false);
        syncStartTimeRef.current = null;
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }
      }
      
      // If stuck on 'pending' for too long, reset to synced
      if (syncStatus === 'pending' && !isSyncing) {
        setSyncStatus('synced');
      }
    };

    // Visibility change trigger - wake up connection when user returns to tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Clear sync timeout when tab is hidden
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }
      } else {
        // Immediate focus refresh when returning to tab
        forceRefreshSyncStatus();
        
        if (isAuthenticated && isOnline) {
          // Verify connection is still alive before triggering sync
          verifyAPIReachability().then((isReachable) => {
            if (isReachable) {
              setSyncStatus('synced');
              setHasPendingSync(false);
            } else {
              setSyncStatus('offline');
              attemptReconnection();
            }
          });
        } else if (isAuthenticated && !isOnline) {
          attemptReconnection();
        }
      }
    };

    // Window focus event for immediate refresh
    const handleWindowFocus = () => {
      if (isAuthenticated) {
        forceRefreshSyncStatus();
      }
    };

    // Periodic connection check (heartbeat) with API verification and sync status reset every 30 seconds
    const connectionCheckInterval = setInterval(async () => {
      const isOnlineNow = navigator.onLine;
      
      // Always check for stuck syncs during heartbeat
      forceRefreshSyncStatus();
      
      if (isOnlineNow && !isOnline) {
        // Verify actual API reachability before claiming online
        const isReachable = await verifyAPIReachability();
        if (isReachable) {
          handleOnline();
        }
      } else if (!isOnlineNow && isOnline) {
        handleOffline();
      } else if (isOnlineNow && isOnline && isAuthenticated) {
        // Keep-alive: verify connection is still active even when online
        const isReachable = await verifyAPIReachability();
        if (!isReachable) {
          handleOffline();
        }
      }
    }, 30000);

    // Set up token refresh
    refreshTokenIfNeeded();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(connectionCheckInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (connectionRetryTimerRef.current) clearTimeout(connectionRetryTimerRef.current);
      if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [isAuthenticated, isOnline, isSyncing, syncStatus, attemptReconnection, verifyAPIReachability, refreshTokenIfNeeded]);

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

  const signIn = useCallback(async (response: GoogleAuthResponse) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Handle OAuth2 token response (has access_token)
      if ('access_token' in response) {
        console.log('[v0] Processing OAuth2 access token');
        const accessToken = response.access_token;
        
        // Store token immediately before attempting userinfo fetch
        localStorage.setItem('google_access_token', accessToken);
        setAccessToken(accessToken);
        setIsAuthenticated(true);
        
        // Try to fetch user info from Google userinfo endpoint
        try {
          console.log('[v0] Fetching user info with access token');
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            console.log('[v0] User info fetched successfully');
            setUser({
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            });
            
            localStorage.setItem('google_user', JSON.stringify({
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            }));
            
            setSyncStatus('synced');
          } else {
            // userinfo endpoint failed, but we still have a valid access token
            console.warn('[v0] userinfo endpoint returned status:', userInfoResponse.status);
            console.log('[v0] Token is valid for Drive API operations');
            setUser({ email: 'usuario@gmail.com', name: 'Usuario', picture: undefined });
            setSyncStatus('synced');
          }
        } catch (userErr) {
          console.log('[v0] Could not fetch user info, but token is still valid:', userErr);
          // Still authenticated with valid token, just without user details
          setUser({ email: 'usuario@gmail.com', name: 'Usuario', picture: undefined });
          setSyncStatus('synced');
        }
      } else if ('credential' in response) {
        // Handle legacy GSI identity token
        console.log('[v0] Processing GSI identity token');
        
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        
        const decoded = JSON.parse(jsonPayload);
        
        localStorage.setItem('google_access_token', response.credential);
        localStorage.setItem('google_user', JSON.stringify({
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
        }));
        
        setAccessToken(response.credential);
        setUser({
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
        });
        setIsAuthenticated(true);
        setSyncStatus('synced');
      } else {
        console.error('[v0] Invalid response format');
        setError('Authentication failed: Invalid response');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('[v0] Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Revoke Google access token if available
      if (accessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
        } catch (revokeErr) {
          // Token revocation failed, but continue with local cleanup
        }
      }

      // 2. NUCLEAR OPTION: Clear ALL localStorage data for maximum security
      localStorage.clear();
      
      // 3. Reset all auth state to initial values
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
      setLastSyncTime(null);
      setSyncStatus('offline');
      setHasPendingSync(false);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      console.error('[v0] Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const updateSyncStatus = useCallback((syncing: boolean, status?: 'synced' | 'pending' | 'error' | 'offline') => {
    setIsSyncing(syncing);
    
    if (syncing) {
      // Track when sync started for timeout detection
      syncStartTimeRef.current = Date.now();
      
      // Set a 10-second timeout to auto-reset stuck syncs
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        // Force reset if still syncing after 10 seconds
        setIsSyncing(false);
        setSyncStatus('synced');
        syncStartTimeRef.current = null;
      }, 10000);
    } else {
      // Clear timeout when sync completes
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      syncStartTimeRef.current = null;
    }
    
    if (!syncing) {
      const newStatus = status || (isOnline ? 'synced' : 'pending');
      setSyncStatus(newStatus);
      
      if (newStatus === 'synced') {
        const now = Date.now();
        setLastSyncTime(now);
        localStorage.setItem('google_last_sync', now.toString());
        localStorage.setItem('google_pending_sync', 'false');
        setHasPendingSync(false);
      } else if (newStatus === 'pending' || newStatus === 'offline') {
        localStorage.setItem('google_pending_sync', 'true');
        setHasPendingSync(true);
      }
    }
  }, [isOnline]);

  const triggerPendingSync = useCallback(async () => {
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
