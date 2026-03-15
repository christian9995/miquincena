'use client';

import { useEffect, useRef } from 'react';
import { useGoogleAuth } from '@/context/GoogleAuthContext';

declare global {
  interface Window {
    google?: any;
    __googleSignInInitialized?: boolean;
  }
}

const GOOGLE_CLIENT_ID = '354861954564-mthf9cjuqpledsk665gmeedpb1u3qpb5.apps.googleusercontent.com';

export default function GoogleSignIn() {
  const { signIn } = useGoogleAuth();
  const handleCredentialResponseRef = useRef<((response: any) => Promise<void>) | null>(null);

  useEffect(() => {
    // Update the ref so the callback always has the latest signIn function
    handleCredentialResponseRef.current = async (response: any) => {
      await signIn(response);
    };
  }, [signIn]);

  useEffect(() => {
    // Only initialize once globally
    if (window.__googleSignInInitialized) {
      return;
    }

    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
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

        const element = document.getElementById('google-signin-button');
        if (element) {
          window.google.accounts.id.renderButton(element, {
            theme: 'outline',
            size: 'medium',
            text: 'signin_with',
            logo_alignment: 'left',
          });
        }
      }
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div id="google-signin-button" className="flex items-center" />
  );
}
