'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGoogleAuth } from '@/context/GoogleAuthContext';

declare global {
  interface Window {
    google?: any;
    __googleOAuth2Initialized?: boolean;
  }
}

// Use environment variable if available, otherwise use fallback
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '354861954564-mthf9cjuqpledsk665gmeedpb1u3qpb5.apps.googleusercontent.com';
const ALLOWED_PARENT_ORIGIN = 'https://www.miquincena.com';

export default function GoogleSignIn() {
  const { signIn } = useGoogleAuth();
  const tokenClientRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle token response - defined outside useEffect to ensure proper scope
  const handleTokenResponse = useCallback(async (response: any) => {
    console.log('[v0] OAuth2 token response received');
    console.log('[v0] Response keys:', Object.keys(response));
    
    if (response.access_token) {
      console.log('[v0] Access token present, length:', response.access_token.length);
      console.log('[v0] Token prefix:', response.access_token.substring(0, 20) + '...');
      console.log('[v0] Calling signIn with token');
      await signIn({
        access_token: response.access_token,
        token_type: response.token_type || 'Bearer',
      });
    } else if (response.error) {
      console.error('[v0] OAuth2 error:', response.error, response.error_description);
      setError(`OAuth2 error: ${response.error}`);
    } else {
      console.error('[v0] No access token in response:', response);
      setError('No token received from OAuth2');
    }
  }, [signIn]);

  // Initialize OAuth2 TokenClient for drive.appdata access
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Validate client ID
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'undefined') {
      console.warn('[v0] NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured. Google Drive sync will be unavailable.');
      setError('Google authentication not configured');
      setIsReady(false);
      return;
    }

    // Skip if already initialized
    if (window.__googleOAuth2Initialized) {
      console.log('[v0] Google OAuth2 already initialized');
      setIsReady(true);
      return;
    }

    // Wait for DOM to be ready
    const initWhenReady = () => {
      if (document.readyState !== 'loading') {
        loadAndInitializeOAuth2();
      } else {
        document.addEventListener('DOMContentLoaded', loadAndInitializeOAuth2);
      }
    };

    const loadAndInitializeOAuth2 = () => {
      if (window.__googleOAuth2Initialized) {
        console.log('[v0] OAuth2 already initialized during load');
        setIsReady(true);
        return;
      }

      console.log('[v0] Starting Google OAuth2 initialization');

      // Load Google client library if not already present
      if (!window.google) {
        console.log('[v0] Loading Google API client');
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log('[v0] Google API client loaded');
          performInitialization();
        };

        script.onerror = () => {
          console.error('[v0] Failed to load Google API client');
          setError('Failed to load Google API');
          setIsReady(false);
        };

        document.head.appendChild(script);
      } else {
        console.log('[v0] Google API client already present');
        performInitialization();
      }
    };

    const performInitialization = () => {
      if (window.__googleOAuth2Initialized) {
        console.log('[v0] Already initialized, skipping');
        setIsReady(true);
        return;
      }

      if (!window.google) {
        console.error('[v0] Google object not available');
        setError('Google API unavailable');
        setIsReady(false);
        return;
      }

      try {
        console.log('[v0] Initializing OAuth2 TokenClient');
        console.log('[v0] Client ID:', GOOGLE_CLIENT_ID.substring(0, 20) + '...');
        
        // Initialize OAuth2 TokenClient with properly formatted scopes
        // Google OAuth2 requires scopes separated by URL-encoded spaces (%20)
        const scopes = 'openid email profile https://www.googleapis.com/auth/drive.appdata';
        
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: scopes,
          callback: handleTokenResponse,
        });

        window.__googleOAuth2Initialized = true;
        console.log('[v0] Google OAuth2 initialized successfully');
        console.log('[v0] Scopes configured:', scopes);
        setIsReady(true);
        setError(null);

      } catch (err) {
        console.error('[v0] Error initializing Google OAuth2:', err);
        setError('OAuth2 initialization failed');
        setIsReady(false);
      }
    };

    initWhenReady();

    return () => {
      document.removeEventListener('DOMContentLoaded', loadAndInitializeOAuth2);
    };
  }, [handleTokenResponse]);

  const handleSignInClick = () => {
    console.log('[v0] Sign-in button clicked');
    if (tokenClientRef.current) {
      // Request token from user (will trigger consent screen if needed)
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    } else {
      console.error('[v0] Token client not ready');
    }
  };

  if (!isReady) {
    return (
      <div className="flex items-center">
        {error ? (
          <span className="text-xs text-gray-400 opacity-60">Auth. no disponible</span>
        ) : (
          <button disabled className="px-4 py-2 text-gray-400 cursor-not-allowed">
            Cargando...
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleSignInClick}
      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 11.75c-.98 0-1.876.38-2.534 1.019-.658.64-1.025 1.508-1.025 2.406s.367 1.766 1.025 2.406c.658.64 1.554 1.019 2.534 1.019.98 0 1.876-.38 2.534-1.019.658-.64 1.025-1.508 1.025-2.406s-.367-1.766-1.025-2.406c-.658-.64-1.554-1.019-2.534-1.019z" />
      </svg>
      Sincronizar con Google
    </button>
  );
}
