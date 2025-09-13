import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/supabase/auth-server'
import { getCaseWithParticipants } from '@/lib/supabase/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MessageCircle, Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { MediationRoom } from '@/components/mediation/mediation-room'

interface MediationRoomPageProps {
  params: Promise<{ caseId: string }>
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  resolved: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
}

const statusLabels = {
  pending: 'Pending',
  active: 'Active',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
}

export default async function MediationRoomPage({ params }: MediationRoomPageProps) {
  const { caseId } = await params
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }

  const caseResult = await getCaseWithParticipants(caseId)

  if (!caseResult.data) {
    redirect('/dashboard')
  }

  const caseData = caseResult.data
  const hasAccess = caseData.created_by === user.id || 
    caseData.case_participants.some(p => p.user_id === user.id)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
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
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 leading-tight">
                  {caseData.title}
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600 line-clamp-3 sm:line-clamp-none">
                  {caseData.description}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={`${statusColors[caseData.status as keyof typeof statusColors]} flex-shrink-0 self-start`}
              >
                {statusLabels[caseData.status as keyof typeof statusLabels]}
              </Badge>
            </div>
          </div>

          {/* Case Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Participants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold" aria-label={`${caseData.case_participants.length} participants`}>
                  {caseData.case_participants.length}
                </div>
                <div className="space-y-1 mt-2 max-h-20 overflow-y-auto mobile-scroll">
                  {caseData.case_participants.map((participant: any) => (
                    <div key={participant.id} className="text-xs text-muted-foreground truncate">
                      {participant.profiles?.full_name || participant.email}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {new Date(caseData.created_at).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(caseData.created_at).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{statusLabels[caseData.status as keyof typeof statusLabels]}</div>
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(caseData.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Mediation Interface */}
          <div className="w-full">
            <MediationRoom caseId={caseId} userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  )
}