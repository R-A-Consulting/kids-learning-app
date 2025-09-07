import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GraduationCap } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()

    // Simple authentication check
    if (username === 'admin' && password === 'admin') {
      // Successful login - show success toast and redirect
      toast.success('Welcome back! Redirecting to dashboard...')
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)
    } else {
      // Failed login - show error toast
      toast.error('Invalid username or password. Please try again.')
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

          <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700">
            Sign In
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Testing Mode: Username: admin, Password: admin
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
