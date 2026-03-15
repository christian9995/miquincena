'use client';

import { useEffect, useRef, useState } from 'react';
import { useGoogleAuth } from '@/context/GoogleAuthContext';

declare global {
  interface Window {
    google?: any;
    __googleOAuth2Initialized?: boolean;
  }
}

const GOOGLE_CLIENT_ID = '354861954564-mthf9cjuqpledsk665gmeedpb1u3qpb5.apps.googleusercontent.com';
const ALLOWED_PARENT_ORIGIN = 'https://www.miquincena.com';

export default function GoogleSignIn() {
  const { signIn } = useGoogleAuth();
  const tokenClientRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize OAuth2 TokenClient for drive.appdata access
  useEffect(() => {
    if (typeof window === 'undefined') {
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
        setIsReady(false);
        return;
      }

      try {
        console.log('[v0] Initializing OAuth2 TokenClient with drive.appdata scope');
        
        // Initialize OAuth2 TokenClient with drive.appdata scope
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.appdata openid email profile',
          callback: (response: any) => {
            console.log('[v0] OAuth2 token response received');
            handleTokenResponse(response);
          },
        });

        window.__googleOAuth2Initialized = true;
        console.log('[v0] Google OAuth2 initialized successfully');
        setIsReady(true);

      } catch (err) {
        console.error('[v0] Error initializing Google OAuth2:', err);
        setIsReady(false);
      }
    };

    const handleTokenResponse = async (response: any) => {
      if (response.access_token) {
        console.log('[v0] Access token received, calling signIn');
        await signIn({
          access_token: response.access_token,
          token_type: response.token_type || 'Bearer',
        });
      } else {
        console.error('[v0] No access token in response');
      }
    };

    initWhenReady();

    return () => {
      document.removeEventListener('DOMContentLoaded', loadAndInitializeOAuth2);
    };
  }, [signIn]);

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
        <button disabled className="px-4 py-2 text-gray-400 cursor-not-allowed">
          Cargando...
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignInClick}
      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium text-gray-700"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 11.75c-.98 0-1.876.38-2.534 1.019-.658.64-1.025 1.508-1.025 2.406s.367 1.766 1.025 2.406c.658.64 1.554 1.019 2.534 1.019.98 0 1.876-.38 2.534-1.019.658-.64 1.025-1.508 1.025-2.406s-.367-1.766-1.025-2.406c-.658-.64-1.554-1.019-2.534-1.019z" />
      </svg>
      Sync con Google
    </button>
  );
}
