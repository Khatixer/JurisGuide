import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { GuidanceChat } from '@/components/guidance/guidance-chat'

async function getServerUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}

export default async function GuidancePage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div>
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                className="mb-3 sm:mb-4 focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                AI Legal Guidance
              </h1>
              <p className="text-base sm:text-lg text-gray-600">
                Get neutral legal information and guidance powered by AI
              </p>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="w-full">
            <GuidanceChat />
          </div>
        </div>
      </div>
    </div>
  )
}