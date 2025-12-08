import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useConsumeToken } from '@/services/apis/auth';
import { useLogin } from '@/services/apis/auth';
import { Loader2 } from 'lucide-react';

export default function AuthConsumePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { consumeToken, isLoading: isConsuming } = useConsumeToken();
  const { login, isLoading: isLoggingIn } = useLogin();
  const [status, setStatus] = useState('processing'); // processing, success, error

  useEffect(() => {
    const handleTokenConsumption = async () => {
      if (!token) {
        toast.error('No token provided');
        setStatus('error');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      try {
        // Consume the token
        const result = await consumeToken(token);

        if (result.success) {
          setStatus('success');
          
          // If user data is returned, we're already logged in
          // Otherwise, try to log in with credentials if provided
          if (result.data?.user) {
            toast.success('Authentication successful');
            setTimeout(() => {
              navigate('/dashboard');
            }, 1000);
          } else if (result.data?.email && result.data?.password) {
            // If API returns credentials, use them to log in
            const loginResult = await login({
              email: result.data.email,
              password: result.data.password,
            });

            if (loginResult.success) {
              toast.success('Login successful');
              setTimeout(() => {
                navigate('/dashboard');
              }, 1000);
            } else {
              toast.error(loginResult.error || 'Login failed');
              setStatus('error');
              setTimeout(() => navigate('/login'), 2000);
            }
          } else {
            // Token consumed successfully but no user data
            // Redirect to dashboard (assuming session is set via cookies)
            toast.success('Authentication successful');
            setTimeout(() => {
              navigate('/dashboard');
            }, 1000);
          }
        } else {
          toast.error(result.error || 'Token consumption failed');
          setStatus('error');
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch {
        toast.error('An unexpected error occurred');
        setStatus('error');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleTokenConsumption();
  }, [token, consumeToken, login, navigate]);

  const isLoading = isConsuming || isLoggingIn || status === 'processing';

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4">
        {isLoading && <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {status === 'processing' && 'Processing authentication...'}
            {status === 'success' && 'Authentication successful!'}
            {status === 'error' && 'Authentication failed'}
          </h2>
          <p className="text-sm text-gray-600">
            {status === 'processing' && 'Please wait while we verify your token'}
            {status === 'success' && 'Redirecting to dashboard...'}
            {status === 'error' && 'Redirecting to login...'}
          </p>
        </div>
      </div>
    </div>
  );
}

