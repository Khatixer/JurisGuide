'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bot, User } from 'lucide-react'
import type { MessageDisplayProps, MessageWithProfile } from '@/types'

export function MessageDisplay({ messages, currentUserId }: MessageDisplayProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start the conversation
            </h3>
            <p className="text-gray-500 max-w-sm">
              Send a message to begin the mediation process. All participants will see your messages in real-time.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3 p-3 sm:p-4 scroll-smooth">
      {messages.map((message) => {
        const isCurrentUser = message.sender_id === currentUserId
        const isAI = message.sender_type === 'ai_mediator'
        const senderName = isAI 
          ? 'AI Mediator' 
          : message.profiles?.full_name || message.profiles?.email || 'Unknown User'
        const senderInitials = isAI 
          ? 'AI' 
          : (message.profiles?.full_name || message.profiles?.email || 'U')
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

        return (
          <div
            key={message.id}
            className={`flex ${isCurrentUser && !isAI ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] sm:max-w-[80%] ${isCurrentUser && !isAI ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 ${isCurrentUser && !isAI ? 'ml-2 sm:ml-3' : 'mr-2 sm:mr-3'}`}>
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarFallback className={`text-xs ${
                    isAI 
                      ? 'bg-[#00C48C] text-white' 
                      : isCurrentUser 
                        ? 'bg-[#0A2540] text-white' 
                        : 'bg-gray-200 text-gray-700'
                  }`}>
                    {isAI ? <Bot className="h-3 w-3 sm:h-4 sm:w-4" /> : senderInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className={`flex flex-col ${isCurrentUser && !isAI ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center space-x-1 sm:space-x-2 mb-1 ${isCurrentUser && !isAI ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                    {senderName}
                  </span>
                  {isAI && (
                    <Badge variant="secondary" className="text-xs bg-[#00C48C] text-white px-1.5 py-0.5">
                      Mediator
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(message.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                
                <div
                  className={`rounded-lg px-3 py-2 sm:px-4 sm:py-2 max-w-full ${
                    isAI
                      ? 'bg-[#00C48C]/10 border border-[#00C48C]/20 text-gray-900'
                      : isCurrentUser
                        ? 'bg-[#0A2540] text-white'
                        : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm break-words">{message.content}</p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}