'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormField, FormLabel, FormMessage } from '@/components/ui/form'
import { LoadingSpinner } from '@/components/ui/loading'
import { createCaseWithParticipants } from '@/lib/supabase/utils'
import { showErrorToast, showSuccessToast, getUserFriendlyErrorMessage } from '@/lib/utils/error-handling'
import { validateEmailList, validateField, caseTitle, caseDescription } from '@/lib/utils/form-validation'
import { Plus, AlertCircle, CheckCircle } from 'lucide-react'

interface CreateCaseModalProps {
  userId: string
}

export function CreateCaseModal({ userId }: CreateCaseModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean
    validEmails: string[]
    invalidEmails: string[]
    error?: string
  }>({ isValid: false, validEmails: [], invalidEmails: [] })
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    participantEmails: ''
  })

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validate title
    const titleValidation = validateField(formData.title, caseTitle)
    if (!titleValidation.isValid) {
      errors.title = titleValidation.error || 'Invalid title'
    }

    // Validate description
    const descriptionValidation = validateField(formData.description, caseDescription)
    if (!descriptionValidation.isValid) {
      errors.description = descriptionValidation.error || 'Invalid description'
    }

    // Validate emails
    const emailValidationResult = validateEmailList(formData.participantEmails)
    setEmailValidation(emailValidationResult)
    if (!emailValidationResult.isValid) {
      errors.participantEmails = emailValidationResult.error || 'Invalid emails'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const caseResult = await createCaseWithParticipants(
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          created_by: userId
        },
        emailValidation.validEmails
      )
      
      const newCase = caseResult.data?.case

      if (newCase) {
        showSuccessToast(
          `Case "${formData.title}" created successfully with ${emailValidation.validEmails.length} participant(s)`,
          'Case Created'
        )
        setOpen(false)
        setFormData({ title: '', description: '', participantEmails: '' })
        setFieldErrors({})
        setEmailValidation({ isValid: false, validEmails: [], invalidEmails: [] })
        router.refresh() // Refresh to show new case
      } else {
        throw new Error(typeof caseResult.error === 'string' ? caseResult.error : 'Failed to create case')
      }
    } catch (err) {
      const friendlyError = getUserFriendlyErrorMessage(err)
      setError(friendlyError)
      showErrorToast(err, 'Failed to create case')
      console.error('Error creating case:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear errors when user starts typing
    if (error) setError('')
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }

    // Real-time email validation
    if (field === 'participantEmails' && value.trim()) {
      const emailValidationResult = validateEmailList(value)
      setEmailValidation(emailValidationResult)
    } else if (field === 'participantEmails') {
      setEmailValidation({ isValid: false, validEmails: [], invalidEmails: [] })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full sm:w-auto bg-[#0A2540] hover:bg-[#0A2540]/90 focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
          aria-label="Start new mediation case"
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">Start New Mediation Case</span>
          <span className="sm:hidden">New Case</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create New Mediation Case</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Start a new mediation case and invite participants via email.
          </DialogDescription>
        </DialogHeader>
        <Form onSubmit={handleSubmit}>
          <FormField>
            <FormLabel htmlFor="title" className="text-sm font-medium">Case Title</FormLabel>
            <Input
              id="title"
              placeholder="Enter a descriptive title for your case"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              className={`mt-1 text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${
                fieldErrors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              aria-describedby="title-help"
              aria-invalid={!!fieldErrors.title}
              maxLength={200}
            />
            {fieldErrors.title && (
              <FormMessage className="text-red-600 text-sm mt-1">{fieldErrors.title}</FormMessage>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {formData.title.length}/200 characters
            </div>
          </FormField>
          
          <FormField>
            <FormLabel htmlFor="description" className="text-sm font-medium">Case Description</FormLabel>
            <Textarea
              id="description"
              placeholder="Provide details about the dispute or issue that needs mediation"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
              rows={4}
              className={`mt-1 text-base resize-none focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${
                fieldErrors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              aria-describedby="description-help"
              aria-invalid={!!fieldErrors.description}
              maxLength={2000}
            />
            {fieldErrors.description && (
              <FormMessage className="text-red-600 text-sm mt-1">{fieldErrors.description}</FormMessage>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {formData.description.length}/2000 characters
            </div>
          </FormField>
          
          <FormField>
            <FormLabel htmlFor="participants" className="text-sm font-medium">Participant Emails</FormLabel>
            <Textarea
              id="participants"
              placeholder="Enter email addresses separated by commas (e.g., john@example.com, jane@example.com)"
              value={formData.participantEmails}
              onChange={(e) => handleInputChange('participantEmails', e.target.value)}
              required
              rows={3}
              className={`mt-1 text-base resize-none focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${
                fieldErrors.participantEmails ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 
                emailValidation.isValid ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''
              }`}
              aria-describedby="participants-help"
              aria-invalid={!!fieldErrors.participantEmails}
            />
            
            {/* Email validation feedback */}
            {formData.participantEmails && (
              <div className="mt-2 space-y-1">
                {emailValidation.validEmails.length > 0 && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Valid emails: {emailValidation.validEmails.join(', ')}
                  </div>
                )}
                {emailValidation.invalidEmails.length > 0 && (
                  <div className="flex items-center text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Invalid emails: {emailValidation.invalidEmails.join(', ')}
                  </div>
                )}
              </div>
            )}
            
            {fieldErrors.participantEmails && (
              <FormMessage className="text-red-600 text-sm mt-1">{fieldErrors.participantEmails}</FormMessage>
            )}
            
            <p id="participants-help" className="text-xs text-muted-foreground mt-1">
              Separate multiple email addresses with commas
            </p>
          </FormField>

          {error && (
            <FormMessage className="text-sm text-red-600" role="alert">
              {error}
            </FormMessage>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title || !formData.description || !formData.participantEmails || !emailValidation.isValid}
              className="w-full sm:w-auto bg-[#0A2540] hover:bg-[#0A2540]/90 focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Case'
              )}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}