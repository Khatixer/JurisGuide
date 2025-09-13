'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading'
import { signIn } from '@/lib/supabase/auth'
import { signInSchema, type SignInFormData } from '@/lib/validations/auth'
import { showErrorToast, showSuccessToast, getUserFriendlyErrorMessage } from '@/lib/utils/error-handling'
import { z } from 'zod'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleInputChange = (field: keyof SignInFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    try {
      signInSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            const field = err.path[0] as string
            fieldErrors[field] = err.message
          }
        })
        setErrors(fieldErrors)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if (!validateForm()) {
      showErrorToast('Please fix the form errors before submitting', 'Form Validation Error')
      return
    }

    setIsLoading(true)

    try {
      await signIn({
        email: formData.email,
        password: formData.password,
      })

      showSuccessToast('Successfully signed in! Welcome back.', 'Welcome Back!')
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      const friendlyError = getUserFriendlyErrorMessage(error)
      setSubmitError(friendlyError)
      showErrorToast(error, 'Sign In Failed')
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 safe-area-inset">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="inline-block mb-4">
            <h1 className="text-2xl font-bold text-[#0A2540]">JurisGuide</h1>
          </Link>
          <CardTitle className="text-xl sm:text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sign in to your JurisGuide account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
                className={`text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${errors.email ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-500" role="alert">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter your password"
                className={`text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${errors.password ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-red-500" role="alert">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0A2540] hover:bg-[#0A2540]/90 focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
              disabled={isLoading}
              aria-label={isLoading ? 'Signing in...' : 'Sign in to your account'}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link 
                href="/signup" 
                className="font-medium text-[#0A2540] hover:text-[#0A2540]/80 focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-sm"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}