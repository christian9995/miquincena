'use client';

import { useEffect, useRef } from 'react';
import { useGoogleAuth } from '@/context/GoogleAuthContext';

declare global {
  interface Window {
    google?: any;
    __googleGSIInitialized?: boolean;
  }
}

const GOOGLE_CLIENT_ID = '354861954564-mthf9cjuqpledsk665gmeedpb1u3qpb5.apps.googleusercontent.com';

export default function GoogleSignIn() {
  const { signIn } = useGoogleAuth();
  const callbackRef = useRef<((response: any) => Promise<void>) | null>(null);

  // Update callback ref whenever signIn changes
  useEffect(() => {
    callbackRef.current = async (response: any) => {
      await signIn(response);
    };
  }, [signIn]);

  // Initialize Google Sign-In only once globally
  useEffect(() => {
    // Skip if already initialized
    if (window.__googleGSIInitialized) {
      console.log('[v0] Google GSI already initialized');
      return;
    }

    // Define initialization function first
    const initializeGSI = () => {
      if (window.__googleGSIInitialized) {
        return;
      }

      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (callbackRef.current) {
                callbackRef.current(response);
              }
            },
          });

          window.__googleGSIInitialized = true;
          console.log('[v0] Google GSI initialized successfully');

          // Render button
          const buttonElement = document.getElementById('google-signin-button');
          if (buttonElement && buttonElement.children.length === 0) {
            window.google.accounts.id.renderButton(buttonElement, {
              theme: 'outline',
              size: 'medium',
              text: 'signin_with',
              logo_alignment: 'left',
            });
          }
        } catch (err) {
          console.error('[v0] Error initializing Google GSI:', err);
        }
      }
    };

    // Check if script is already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        initializeGSI();
      };

      script.onerror = () => {
        console.error('[v0] Failed to load Google GSI script');
      };

      document.head.appendChild(script);
    } else {
      // Script already loaded, just initialize
      initializeGSI();
    }
  }, []);

  return (
    <div id="google-signin-button" className="flex items-center" />
  );
}
