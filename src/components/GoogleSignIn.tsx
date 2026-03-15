'use client';

import { useEffect, useRef, useState } from 'react';
import { useGoogleAuth } from '@/context/GoogleAuthContext';

declare global {
  interface Window {
    google?: any;
    __googleGSIInitialized?: boolean;
  }
}

const GOOGLE_CLIENT_ID = '354861954564-mthf9cjuqpledsk665gmeedpb1u3qpb5.apps.googleusercontent.com';
const ALLOWED_PARENT_ORIGIN = 'https://www.miquincena.com';

export default function GoogleSignIn() {
  const { signIn } = useGoogleAuth();
  const callbackRef = useRef<((response: any) => Promise<void>) | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Update callback ref whenever signIn changes
  useEffect(() => {
    callbackRef.current = async (response: any) => {
      console.log('[v0] Credential response received');
      await signIn(response);
    };
  }, [signIn]);

  // Initialize Google Sign-In only once, after DOM is ready
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Already initialized
    if (window.__googleGSIInitialized) {
      console.log('[v0] Google GSI already initialized, skipping');
      setIsReady(true);
      return;
    }

    // Wait for DOM to be fully loaded
    const initWhenReady = () => {
      if (document.readyState !== 'loading') {
        loadAndInitializeGSI();
      } else {
        document.addEventListener('DOMContentLoaded', loadAndInitializeGSI);
      }
    };

    const loadAndInitializeGSI = () => {
      // Skip if already initialized during this load
      if (window.__googleGSIInitialized) {
        console.log('[v0] GSI initialized during load');
        setIsReady(true);
        return;
      }

      console.log('[v0] Starting Google GSI initialization');

      // Check if script is already loaded
      if (!window.google) {
        console.log('[v0] Loading Google GSI script');
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.nonce = 'gsi-nonce';
        
        script.onload = () => {
          console.log('[v0] Google GSI script loaded');
          performInitialization();
        };

        script.onerror = () => {
          console.error('[v0] Failed to load Google GSI script');
          setIsReady(false);
        };

        document.head.appendChild(script);
      } else {
        console.log('[v0] Google GSI script already present');
        performInitialization();
      }
    };

    const performInitialization = () => {
      // Double-check flag before initializing
      if (window.__googleGSIInitialized) {
        console.log('[v0] Already initialized, skipping');
        setIsReady(true);
        return;
      }

      if (!window.google) {
        console.error('[v0] Google object not available');
        return;
      }

      try {
        console.log('[v0] Calling google.accounts.id.initialize');
        
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            console.log('[v0] GSI callback invoked');
            if (callbackRef.current) {
              callbackRef.current(response);
            }
          },
          allowed_parent_origin: ALLOWED_PARENT_ORIGIN,
        });

        window.__googleGSIInitialized = true;
        console.log('[v0] Google GSI initialized successfully');
        setIsReady(true);

        // Render button
        const buttonElement = document.getElementById('google-signin-button');
        if (buttonElement && buttonElement.children.length === 0) {
          console.log('[v0] Rendering Google Sign-In button');
          window.google.accounts.id.renderButton(buttonElement, {
            theme: 'outline',
            size: 'medium',
            text: 'signin_with',
            logo_alignment: 'left',
          });
        }
      } catch (err) {
        console.error('[v0] Error initializing Google GSI:', err);
        setIsReady(false);
      }
    };

    initWhenReady();

    // Cleanup function
    return () => {
      document.removeEventListener('DOMContentLoaded', loadAndInitializeGSI);
    };
  }, []);

  return (
    <div
      id="google-signin-button"
      className="flex items-center"
      data-allowed_parent_origin={ALLOWED_PARENT_ORIGIN}
      data-login_uri={ALLOWED_PARENT_ORIGIN}
    />
  );
}
