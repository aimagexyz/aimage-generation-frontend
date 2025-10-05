import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface LocationState {
  from?: {
    pathname: string;
  };
}

export default function LoginCard() {
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const handleLoginSuccess = () => {
    const from = locationState?.from?.pathname || '/';
    window.location.href = from;
  };

  const handleLoginError = (error: Error) => {
    setError(error.message);
  };

  return (
    <div className="flex flex-col items-center pt-32 pb-16">
      <Card className="w-[350px] shadow-lg border-0 rounded-xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-center">ログイン</CardTitle>
          <CardDescription className="text-center">Google アカウントでログイン</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <GoogleLoginButton className="w-full" onSuccess={handleLoginSuccess} onError={handleLoginError} />
        </CardContent>
      </Card>
    </div>
  );
}
