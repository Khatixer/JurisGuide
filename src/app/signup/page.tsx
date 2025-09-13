'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading'
import { signUp } from '@/lib/supabase/auth'
import { signUpSchema, type SignUpFormData } from '@/lib/validations/auth'
import { showErrorToast, showSuccessToast, getUserFriendlyErrorMessage } from '@/lib/utils/error-handling'
import { countries } from '@/lib/constants/countries'
import { z } from 'zod'

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
    role: 'user',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleInputChange = (field: keyof SignUpFormData, value: string) => {
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
      signUpSchema.parse(formData)
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
      await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        country: formData.country,
        role: formData.role,
      })

      showSuccessToast('Account created successfully! Welcome to JurisGuide.', 'Welcome!')
      
      // Redirect to dashboard or confirmation page
      router.push('/dashboard')
    } catch (error) {
      const friendlyError = getUserFriendlyErrorMessage(error)
      setSubmitError(friendlyError)
      showErrorToast(error, 'Signup Failed')
      console.error('Signup error:', error)
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
          <CardTitle className="text-xl sm:text-2xl font-bold">Create your account</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Join JurisGuide to access legal guidance and mediation services
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
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Enter your full name"
                className={`text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${errors.fullName ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              />
              {errors.fullName && (
                <p id="fullName-error" className="text-sm text-red-500" role="alert">{errors.fullName}</p>
              )}
            </div>

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
                placeholder="Create a password"
                className={`text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${errors.password ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-red-500" role="alert">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
                className={`text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${errors.confirmPassword ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-red-500" role="alert">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-medium">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => handleInputChange('country', value)}
              >
                <SelectTrigger 
                  className={`text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${errors.country ? 'border-red-500' : ''}`}
                  aria-invalid={!!errors.country}
                  aria-describedby={errors.country ? 'country-error' : undefined}
                >
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p id="country-error" className="text-sm text-red-500" role="alert">{errors.country}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange('role', value as 'user' | 'lawyer' | 'admin')}
              >
                <SelectTrigger 
                  className={`text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${errors.role ? 'border-red-500' : ''}`}
                  aria-invalid={!!errors.role}
                  aria-describedby={errors.role ? 'role-error' : undefined}
                >
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Individual User</SelectItem>
                  <SelectItem value="lawyer">Legal Professional</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p id="role-error" className="text-sm text-red-500" role="alert">{errors.role}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0A2540] hover:bg-[#0A2540]/90 focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
              disabled={isLoading}
              aria-label={isLoading ? 'Creating account...' : 'Create your account'}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="font-medium text-[#0A2540] hover:text-[#0A2540]/80 focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 rounded-sm"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}