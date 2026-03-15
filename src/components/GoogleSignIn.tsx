'use client';

import { useEffect, useRef } from 'react';
import { useGoogleAuth } from '@/context/GoogleAuthContext';

declare global {
  interface Window {
    google?: any;
    __googleSignInScriptLoaded?: boolean;
    __googleSignInInitialized?: boolean;
  }
}

const GOOGLE_CLIENT_ID = '354861954564-mthf9cjuqpledsk665gmeedpb1u3qpb5.apps.googleusercontent.com';

export default function GoogleSignIn() {
  const { signIn } = useGoogleAuth();
  const handleCredentialResponseRef = useRef<((response: any) => Promise<void>) | null>(null);

  // Store callback in ref to prevent stale closures
  useEffect(() => {
    handleCredentialResponseRef.current = async (response: any) => {
      await signIn(response);
    };
  }, [signIn]);

  // Load and initialize Google Sign-In script only once
  useEffect(() => {
    // Skip if already initialized
    if (window.__googleSignInInitialized) {
      console.log('[v0] Google Sign-In already initialized, skipping');
      return;
    }

    // Load script only once
    if (!window.__googleSignInScriptLoaded) {
      console.log('[v0] Loading Google Sign-In script');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('[v0] Google Sign-In script loaded, initializing');
        if (window.google && !window.__googleSignInInitialized) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (handleCredentialResponseRef.current) {
                handleCredentialResponseRef.current(response);
              }
            },
          });

          // Mark as initialized to prevent multiple calls
          window.__googleSignInInitialized = true;
          console.log('[v0] Google Sign-In initialized successfully');
        }
      };

      script.onerror = () => {
        console.error('[v0] Failed to load Google Sign-In script');
      };

      document.body.appendChild(script);
      window.__googleSignInScriptLoaded = true;
    }

    // Render button if script is already loaded
    if (window.google && window.__googleSignInInitialized) {
      console.log('[v0] Rendering Google Sign-In button');
      const element = document.getElementById('google-signin-button');
      if (element && element.children.length === 0) {
        window.google.accounts.id.renderButton(element, {
          theme: 'outline',
          size: 'medium',
          text: 'signin_with',
          logo_alignment: 'left',
        });
      }
    }
  }, []);

  return (
    <div id="google-signin-button" className="flex items-center" />
  );
}
