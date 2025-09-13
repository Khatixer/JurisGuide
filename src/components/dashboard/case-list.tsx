'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Users, Calendar } from 'lucide-react'
import type { CaseListProps, CaseWithParticipants, CaseStatus } from '@/types'

const statusColors: Record<CaseStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  resolved: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
}

const statusLabels: Record<CaseStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
}

export function CaseList({ cases }: CaseListProps) {
  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
          <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" aria-hidden="true" />
          <h3 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2">
            No cases yet
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm px-4">
            Start your first mediation case to begin resolving disputes with AI-powered assistance.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {cases.map((caseItem) => (
        <Card key={caseItem.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <CardTitle className="text-base sm:text-lg leading-tight">
                  {caseItem.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                  {caseItem.description}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={`${statusColors[caseItem.status]} flex-shrink-0 self-start`}
              >
                {statusLabels[caseItem.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{caseItem.case_participants.length} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>
                    Created {new Date(caseItem.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {caseItem.status === 'active' && (
                  <Link href={`/dashboard/mediation/${caseItem.id}`} className="flex-1 sm:flex-none">
                    <Button 
                      size="sm" 
                      className="w-full sm:w-auto bg-[#0A2540] hover:bg-[#0A2540]/90 focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
                      aria-label={`Enter mediation room for ${caseItem.title}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                      <span className="hidden sm:inline">Enter Room</span>
                      <span className="sm:hidden">Enter</span>
                    </Button>
                  </Link>
                )}
                {caseItem.status === 'pending' && (
                  <Link href={`/dashboard/mediation/${caseItem.id}`} className="flex-1 sm:flex-none">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full sm:w-auto focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
                      aria-label={`View case details for ${caseItem.title}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                      <span className="hidden sm:inline">View Case</span>
                      <span className="sm:hidden">View</span>
                    </Button>
                  </Link>
                )}
                {(caseItem.status === 'resolved' || caseItem.status === 'cancelled') && (
                  <Link href={`/dashboard/mediation/${caseItem.id}`} className="flex-1 sm:flex-none">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full sm:w-auto focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
                      aria-label={`View history for ${caseItem.title}`}
                    >
                      <span className="hidden sm:inline">View History</span>
                      <span className="sm:hidden">History</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            
            {caseItem.case_participants.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Participants:</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {caseItem.case_participants.map((participant) => (
                    <Badge 
                      key={participant.id} 
                      variant="secondary" 
                      className="text-xs px-2 py-1 truncate max-w-[150px] sm:max-w-none"
                      title={participant.profiles?.full_name || participant.email}
                    >
                      {participant.profiles?.full_name || participant.email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}