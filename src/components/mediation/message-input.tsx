'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Bot, Loader2 } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>
  onAskAIMediator: () => Promise<void>
  isLoading?: boolean
  isAILoading?: boolean
  disabled?: boolean
}

export function MessageInput({ 
  onSendMessage, 
  onAskAIMediator, 
  isLoading = false, 
  isAILoading = false,
  disabled = false 
}: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading || disabled) return

    const messageContent = message.trim()
    setMessage('')
    await onSendMessage(messageContent)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="border-t bg-white p-3 sm:p-4 rounded-b-lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
          className="min-h-[60px] sm:min-h-[80px] resize-none text-base focus:ring-2 focus:ring-[#0A2540] focus:border-[#0A2540]"
          disabled={isLoading || disabled}
          aria-label="Message input"
        />
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onAskAIMediator}
            disabled={isAILoading || disabled}
            className="border-[#00C48C] text-[#00C48C] hover:bg-[#00C48C] hover:text-white focus:ring-2 focus:ring-[#00C48C] focus:ring-offset-2 text-sm sm:text-base py-2 sm:py-2 touch-manipulation"
            aria-label="Ask AI Mediator for guidance"
          >
            {isAILoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">
              {isAILoading ? 'AI Thinking...' : 'Ask AI Mediator'}
            </span>
            <span className="sm:hidden">
              {isAILoading ? 'AI Thinking...' : 'Ask AI'}
            </span>
          </Button>
          
          <Button
            type="submit"
            disabled={!message.trim() || isLoading || disabled}
            className="bg-[#0A2540] hover:bg-[#0A2540]/90 focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 text-sm sm:text-base py-2 sm:py-2 touch-manipulation"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  )
}