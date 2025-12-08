import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrossDomainLogin } from '@/services/apis/auth';
import { Code2, Copy, Check } from 'lucide-react';

export default function CrossDomainLoginTestPage() {
  const [email, setEmail] = useState('john@example.com');
  const [password, setPassword] = useState('a1996kasH!');
  const [redirectUrl, setRedirectUrl] = useState('https://app.ismdev.in/auth/consume');
  const [copied, setCopied] = useState(false);
  const { crossDomainLogin, isLoading, error, response, clearError, clearResponse } = useCrossDomainLogin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    clearResponse();

    try {
      const result = await crossDomainLogin({
        email,
        password,
        redirectUrl,
      });

      if (result.success) {
        toast.success('API call successful!');
      } else {
        toast.error(result.error || 'API call failed');
      }
    } catch {
      toast.error('An unexpected error occurred');
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Response copied to clipboard');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Cross-Domain Login API Test</h1>
          <p className="text-sm text-gray-600">Test the /api/v1/auth/cross-domain-login endpoint</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Request Payload</CardTitle>
              <CardDescription>Enter the credentials to test the API</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="redirectUrl" className="text-gray-700 font-medium">
                    Redirect URL
                  </Label>
                  <Input
                    id="redirectUrl"
                    type="url"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="https://app.ismdev.in/auth/consume"
                    className="w-full"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Testing...' : 'Test API'}
                </Button>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Response</CardTitle>
                  <CardDescription>Response from the API endpoint</CardDescription>
                </div>
                {response && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyResponse}
                    className="h-8"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {response ? (
                <div className="space-y-2">
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-96">
                    <pre className="text-xs">
                      <code>{JSON.stringify(response, null, 2)}</code>
                    </pre>
                  </div>
                  {response.data?.token && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm font-medium text-blue-900 mb-1">Token:</p>
                      <p className="text-xs text-blue-700 break-all">{response.data.token}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Code2 className="h-12 w-12 mb-2" />
                  <p className="text-sm">No response yet</p>
                  <p className="text-xs mt-1">Submit the form to test the API</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Endpoint</CardTitle>
            <CardDescription>Endpoint being tested</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-md">
              <code className="text-sm">POST /api/v1/auth/cross-domain-login</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

