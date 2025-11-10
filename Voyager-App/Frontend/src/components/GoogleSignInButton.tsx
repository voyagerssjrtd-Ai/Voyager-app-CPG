// src/components/GoogleSignInButton.tsx
import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/** Minimal JWT decode (no external lib) */
function parseJwt(token?: string | null) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const GoogleSignInButton: React.FC<{ redirectTo?: string }> = ({ redirectTo = '/chat' }) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  function onSuccess(credentialResponse: CredentialResponse) {
    const cred = credentialResponse.credential;
    const profile = parseJwt(cred as string);
    if (profile) {
      const user = {
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
        sub: profile.sub,
      };
      login(user);
      navigate(redirectTo, { replace: true });
    } else {
      console.warn('Google credential parse failed');
    }
  }

  function onError() {
    console.warn('Google Sign In failed');
  }

  return <GoogleLogin onSuccess={onSuccess} onError={onError} useOneTap={false} />;
};

export default GoogleSignInButton;
