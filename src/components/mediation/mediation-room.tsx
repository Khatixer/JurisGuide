'use client'

import { useState, useEffect, useRef } from 'react'
import { Message } from '@/types/database'
import { MessageDisplay } from './message-display'
import { MessageInput } from './message-input'
import { LoadingState } from '@/components/ui/loading'
import { getCaseMessages, sendMessage, subscribeToMessages, unsubscribeFromChannel } from '@/lib/supabase/utils'
import { showErrorToast, showSuccessToast, getUserFriendlyErrorMessage, withRetry } from '@/lib/utils/error-handling'
import { useToast } from '@/hooks/use-toast'

interface MediationRoomProps {
  caseId: string
  userId: string
}

export function MediationRoom({ caseId, userId }: MediationRoomProps) {
  const [messages, setMessages] = useState<(Message & { 
    profiles?: { 
      full_name: string | null
      email: string 
    } | null 
  })[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAILoading, setIsAILoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const subscriptionRef = useRef<ReturnType<typeof subscribeToMessages> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load initial messages with retry
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const messagesResult = await withRetry(
          () => getCaseMessages(caseId),
          { maxAttempts: 3, baseDelay: 1000 },
          (attempt, error) => {
            console.warn(`Loading messages attempt ${attempt} failed:`, error.message)
          }
        )
        
        if (messagesResult.data) {
          setMessages(messagesResult.data)
        } else {
          throw new Error('No messages data received')
        }
      } catch (error) {
        console.error('Error loading messages:', error)
        showErrorToast(error, 'Failed to load messages')
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadMessages()
  }, [caseId, toast])

  // Set up real-time subscription
  useEffect(() => {
    if (!caseId) return

    const subscription = subscribeToMessages(caseId, (newMessage) => {
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some(msg => msg.id === newMessage.id)
        if (exists) return prev
        
        return [...prev, newMessage]
      })
    })

    subscriptionRef.current = subscription

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [caseId])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    setIsLoading(true)
    try {
      const messageResult = await withRetry(
        () => sendMessage({
          case_id: caseId,
          sender_id: userId,
          content,
          sender_type: 'user'
        }),
        { maxAttempts: 3, baseDelay: 1000 },
        (attempt, error) => {
          console.warn(`Send message attempt ${attempt} failed:`, error.message)
        }
      )
      
      const newMessage = messageResult.data
      if (!newMessage) {
        throw new Error('Failed to send message')
      }
      
      // Message will be added via real-time subscription
      showSuccessToast('Your message has been delivered to all participants', 'Message Sent')
    } catch (error) {
      console.error('Error sending message:', error)
      showErrorToast(error, 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAskAIMediator = async () => {
    setIsAILoading(true)
    try {
      // Validate that there are messages to analyze
      if (messages.length === 0) {
        throw new Error('No messages available for AI mediation analysis')
      }

      // Get recent messages for context (last 10 messages)
      const recentMessages = messages.slice(-10).map(msg => ({
        sender_type: msg.sender_type,
        content: msg.content,
        sender_name: msg.sender_type === 'ai_mediator' 
          ? 'AI Mediator' 
          : msg.profiles?.full_name || msg.profiles?.email || 'User'
      }))

      const response = await withRetry(
        async () => {
          const res = await fetch('/api/mediate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              caseId,
              chatHistory: recentMessages,
            }),
          })

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.error || `Request failed with status ${res.status}`)
          }

          return res.json()
        },
        { maxAttempts: 2, baseDelay: 2000 },
        (attempt, error) => {
          console.warn(`AI mediation attempt ${attempt} failed:`, error.message)
        }
      )

      if (!response.success || !response.data?.response) {
        throw new Error('Invalid response from AI mediator service')
      }
      
      // Send AI mediator message
      const aiMessageResult = await sendMessage({
        case_id: caseId,
        sender_id: null,
        content: response.data.response,
        sender_type: 'ai_mediator'
      })
      
      const aiMessage = aiMessageResult.data
      if (!aiMessage) {
        throw new Error('Failed to send AI mediator message')
      }

      // Message will be added via real-time subscription
      showSuccessToast('The AI mediator has provided guidance based on the conversation', 'AI Mediator Responded')
    } catch (error) {
      console.error('Error getting AI mediation:', error)
      showErrorToast(error, 'AI Mediator Error')
    } finally {
      setIsAILoading(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingState message="Loading mediation room..." size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px] sm:h-[700px] lg:h-[600px] bg-white rounded-lg border shadow-sm">
      <div className="flex-shrink-0 border-b bg-gray-50 px-4 py-3 rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-900">Mediation Room</h3>
        <p className="text-sm text-gray-600">Real-time communication with all participants</p>
      </div>
      <MessageDisplay messages={messages} currentUserId={userId} />
      <div ref={messagesEndRef} />
      <MessageInput
        onSendMessage={handleSendMessage}
        onAskAIMediator={handleAskAIMediator}
        isLoading={isLoading}
        isAILoading={isAILoading}
      />
    </div>
  )
}