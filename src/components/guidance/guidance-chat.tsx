'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Brain, Send, MessageSquare, Scale, Users, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner, InlineLoading } from '@/components/ui/loading'
import { apiRequest, showErrorToast, showSuccessToast, getUserFriendlyErrorMessage } from '@/lib/utils/error-handling'
import type { 
  GuidanceChatMessage, 
  SatisfactionState, 
  GuidanceChatProps,
  GuidanceApiRequest,
  GuidanceStreamChunk
} from '@/types'

export function GuidanceChat({ initialMessages = [] }: GuidanceChatProps) {
  const [messages, setMessages] = useState<GuidanceChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [satisfaction, setSatisfaction] = useState<SatisfactionState>({ shown: false, satisfied: null })
  const [error, setError] = useState<string>('')
  const [retryCount, setRetryCount] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Clear any previous errors
    setError('')

    // Validate input length
    if (input.trim().length < 10) {
      setError('Please provide a more detailed question (at least 10 characters)')
      return
    }

    if (input.trim().length > 2000) {
      setError('Question is too long (maximum 2000 characters)')
      return
    }

    const userMessage: GuidanceChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Create placeholder AI message for streaming
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: GuidanceChatMessage = {
      id: aiMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, aiMessage])

    try {
      const requestBody: GuidanceApiRequest = {
        question: userMessage.content,
        stream: true,
        context: {
          previousQuestions: messages
            .filter(msg => msg.type === 'user')
            .slice(-3)
            .map(msg => msg.content)
        }
      }

      const response = await fetch('/api/guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let accumulatedContent = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                setIsLoading(false)
                setSatisfaction({ shown: true, satisfied: null })
                setRetryCount(0) // Reset retry count on success
                showSuccessToast('Legal guidance provided successfully')
                return
              }

              try {
                const parsed: GuidanceStreamChunk = JSON.parse(data)
                if (parsed.chunk) {
                  accumulatedContent += parsed.chunk
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    )
                  )
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      } else {
        // Fallback to regular response if streaming fails
        const apiResponse = await response.json()
        
        if (apiResponse.success && apiResponse.data) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: apiResponse.data.response }
                : msg
            )
          )
          setSatisfaction({ shown: true, satisfied: null })
          setRetryCount(0)
          showSuccessToast('Legal guidance provided successfully')
        } else {
          throw new Error(apiResponse.error || 'Failed to get response')
        }
      }
    } catch (error) {
      console.error('Error getting guidance:', error)
      const friendlyError = getUserFriendlyErrorMessage(error)
      setError(friendlyError)
      
      // Remove the placeholder AI message on error
      setMessages(prev => prev.filter(msg => msg.id !== aiMessageId))
      
      // Show error toast with retry option
      showErrorToast(error, 'Failed to get legal guidance')
      
      setRetryCount(prev => prev + 1)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = messages.filter(msg => msg.type === 'user').pop()
      if (lastUserMessage) {
        setInput(lastUserMessage.content)
        setError('')
      }
    }
  }

  const handleSatisfactionResponse = (satisfied: boolean) => {
    setSatisfaction(prev => ({ ...prev, satisfied }))
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Card */}
      {messages.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <Brain className="h-5 w-5 mr-2 text-[#00C48C]" aria-hidden="true" />
              Welcome to AI Legal Guidance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600 text-sm sm:text-base">
                Ask me any legal question and I&apos;ll provide general legal information to help you understand your situation. 
                Remember, this is general information only - not legal advice.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> This AI provides general legal information, not legal advice. 
                  For specific legal advice tailored to your situation, please consult with a qualified attorney.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <MessageSquare className="h-5 w-5 mr-2 text-[#00C48C]" aria-hidden="true" />
              Legal Guidance Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto scroll-smooth">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-2 ${
                      message.type === 'user'
                        ? 'bg-[#0A2540] text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm sm:text-base break-words">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2 sm:px-4 sm:py-2">
                    <InlineLoading message="Analyzing your question..." />
                  </div>
                </div>
              )}
              
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-md">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-700">{error}</p>
                        {retryCount > 0 && (
                          <Button
                            onClick={handleRetry}
                            variant="outline"
                            size="sm"
                            className="mt-2 text-red-700 border-red-300 hover:bg-red-50"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Try Again
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Satisfaction Check */}
      {satisfaction.shown && satisfaction.satisfied === null && (
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center space-y-4">
              <p className="text-gray-700 text-sm sm:text-base">Was this guidance helpful?</p>
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                <Button
                  onClick={() => handleSatisfactionResponse(true)}
                  variant="outline"
                  className="border-[#00C48C] text-[#00C48C] hover:bg-[#00C48C] hover:text-white focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 touch-manipulation"
                >
                  Yes, helpful
                </Button>
                <Button
                  onClick={() => handleSatisfactionResponse(false)}
                  variant="outline"
                  className="focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation"
                >
                  Need more help
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {satisfaction.satisfied !== null && (
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center space-y-4">
              {satisfaction.satisfied ? (
                <div>
                  <p className="text-gray-700 mb-4 text-sm sm:text-base">
                    Great! If you need further assistance, consider these options:
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 mb-4 text-sm sm:text-base">
                    For more personalized help, consider these options:
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-[#0A2540]">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="text-center space-y-2">
                      <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-[#0A2540] mx-auto" aria-hidden="true" />
                      <h3 className="font-semibold text-[#0A2540] text-sm sm:text-base">Consult a Lawyer</h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Get professional legal advice tailored to your specific situation
                      </p>
                      <Button className="w-full bg-[#0A2540] hover:bg-[#0A2540]/90 focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation text-sm">
                        Find Legal Help
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#00C48C]">
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="text-center space-y-2">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 text-[#00C48C] mx-auto" aria-hidden="true" />
                      <h3 className="font-semibold text-[#00C48C] text-sm sm:text-base">Start Mediation</h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Resolve disputes through our AI-assisted mediation platform
                      </p>
                      <Link href="/dashboard">
                        <Button className="w-full bg-[#00C48C] hover:bg-[#00C48C]/90 focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 touch-manipulation text-sm">
                          Start Mediation
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Form */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  if (error) setError('') // Clear error when user starts typing
                }}
                placeholder="Ask your legal question here... (e.g., 'What are my rights as a tenant?' or 'How do I file a small claims case?')"
                className={`min-h-[80px] sm:min-h-[100px] resize-none text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540] ${
                  error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                disabled={isLoading}
                aria-label="Legal question input"
                aria-invalid={!!error}
                maxLength={2000}
              />
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Minimum 10 characters for detailed guidance</span>
                <span className={input.length > 1800 ? 'text-orange-500' : ''}>
                  {input.length}/2000
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <p className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
                This AI provides general legal information, not legal advice
              </p>
              <Button
                type="submit"
                disabled={!input.trim() || input.trim().length < 10 || isLoading}
                className="w-full sm:w-auto bg-[#0A2540] hover:bg-[#0A2540]/90 focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 touch-manipulation order-1 sm:order-2"
                aria-label="Submit legal question"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                {isLoading ? 'Processing...' : 'Ask Question'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}