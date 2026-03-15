'use client';

import { useEffect } from 'react';
import { useGoogleAuth } from '@/context/GoogleAuthContext';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = '354861954564-mthf9cjuqpledsk665gmeedpb1u3qpb5.apps.googleusercontent.com';

export default function GoogleSignIn() {
  const { signIn } = useGoogleAuth();

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          scope: 'https://www.googleapis.com/auth/drive.appdata email profile',
        });

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

  const handleCredentialResponse = async (response: any) => {
    await signIn(response);
  };

  return (
    <div id="google-signin-button" className="flex items-center" />
  );
}
