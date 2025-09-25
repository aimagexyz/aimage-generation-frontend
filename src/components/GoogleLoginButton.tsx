import { useCallback, useEffect, useRef } from 'react';

import { CLIENT_ID, GOOGLE_CLIENT_ID, SENTRY_ENVIRONMENT } from '@/constants/env';
import { loginWithGoogle } from '@/services/auth';

// 声明全局 Google 身份服务类型
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function GoogleLoginButton({ onSuccess, onError, className }: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const googleScriptLoaded = useRef(false);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        await loginWithGoogle(response.credential);
        onSuccess?.();
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('ログインに失敗しました'));
      }
    },
    [onSuccess, onError],
  );

  const initializeGoogleLogin = useCallback(() => {
    const clientId: string = SENTRY_ENVIRONMENT === 'production' ? CLIENT_ID : GOOGLE_CLIENT_ID;

    if (window.google && buttonRef.current) {
      try {
        window.google.accounts.id.initialize({
          ['client_id']: clientId,
          callback: handleCredentialResponse,
          ['auto_select']: false,
          ['cancel_on_tap_outside']: false,
          ['ux_mode']: 'popup',
          ['itp_support']: true,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          ['logo_alignment']: 'left',
          width: '300px',
        });
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Google ログインの初期化に失敗しました'));
      }
    }
  }, [handleCredentialResponse, onError]);

  useEffect(() => {
    if (!googleScriptLoaded.current) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeGoogleLogin();
      };
      script.onerror = () => {
        onError?.(new Error('Google ログインサービスの読み込みに失敗しました'));
      };
      document.body.appendChild(script);
      googleScriptLoaded.current = true;

      return () => {
        document.body.removeChild(script);
      };
    } else {
      initializeGoogleLogin();
    }
  }, [initializeGoogleLogin, onError]);

  return (
    <div className={`${className} transition-all duration-300 hover:opacity-95 hover:shadow-md rounded-full`}>
      <div ref={buttonRef} className="w-full" />
    </div>
  );
}
