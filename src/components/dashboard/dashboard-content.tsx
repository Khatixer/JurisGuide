'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateCaseModal } from './create-case-modal'
import { CaseList } from './case-list'
import { Brain, MessageCircle, Scale } from 'lucide-react'
import type { Profile, Case, CaseParticipant } from '@/types/database'

interface CaseWithParticipants extends Case {
  case_participants: (CaseParticipant & {
    profiles?: {
      full_name: string | null
      email: string
    } | null
  })[]
}

interface DashboardContentProps {
  profile: Profile
  cases: CaseWithParticipants[]
}

export function DashboardContent({ profile, cases = [] }: DashboardContentProps) {
  const activeCases = cases.filter(c => c.status === 'active').length
  const pendingCases = cases.filter(c => c.status === 'pending').length
  const resolvedCases = cases.filter(c => c.status === 'resolved').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {profile?.full_name || "User"}!
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              Manage your legal guidance and mediation cases
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" aria-label={`${activeCases} active cases`}>
                  {activeCases}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently in mediation
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Cases</CardTitle>
                <Scale className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600" aria-label={`${pendingCases} pending cases`}>
                  {pendingCases}
                </div>
                <p className="text-xs text-muted-foreground">
                  Waiting for participants
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved Cases</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" aria-label={`${resolvedCases} resolved cases`}>
                  {resolvedCases}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link href="/dashboard/guidance" className="flex-1 sm:flex-none">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-[#00C48C] hover:bg-[#00C48C]/90 focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 touch-manipulation"
                aria-label="Start new legal guidance session"
              >
                <Brain className="h-5 w-5 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Start New Legal Guidance</span>
                <span className="sm:hidden">Legal Guidance</span>
              </Button>
            </Link>
            
            <div className="flex-1 sm:flex-none">
              <CreateCaseModal userId={profile?.id ?? ""} />
            </div>
          </div>

          {/* Cases Section */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Cases</h2>
              <p className="text-sm text-muted-foreground">
                {cases.length} total case{cases.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <CaseList cases={cases} />
          </div>
        </div>
      </div>
    </div>
  )
}