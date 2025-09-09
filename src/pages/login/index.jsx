import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GraduationCap } from 'lucide-react'
import { useLogin } from '@/services/apis/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { login, isLoading, error } = useLogin()

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const result = await login({
        email: username,
        password: password
      })

      if (result.success) {
        // Successful login - show success toast and redirect
        setTimeout(() => {
          navigate('/dashboard')
        }, 100)
      } else {
        // Failed login - show error toast
        toast.error(result.error || 'Login failed. Please try again.')
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <GraduationCap className="h-12 w-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">KidsLearn</h1>
            <p className="text-sm text-gray-600">Please sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-700 font-medium">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full h-11"
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
              placeholder="Enter your password"
              className="w-full h-11"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          {error && (
            <div className="text-center">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Enter your credentials to sign in
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
