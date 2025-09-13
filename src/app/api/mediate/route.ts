import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, type ApiContext } from '@/lib/utils/api-middleware'
import { logger } from '@/lib/utils/logger'
import { measureAsync } from '@/lib/utils/performance'
import type { 
  MediationApiRequest,
  MediationApiResponse,
  MediationChatMessage,
  ApiErrorResponse,
  GeminiGenerationConfig
} from '@/types/api'
import type { AuthUser } from '@/types'
import type { MessageSenderType } from '@/types/database'

// Initialize Google Gemini AI with proper error handling and mock support
const initializeAI = (): GoogleGenerativeAI => {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Google AI API key not configured')
  }
  
  // Check if we're using a dummy API key
  if (apiKey.includes('DummyKeyForTestingPurposesOnly')) {
    console.log('🔧 Using mock Gemini AI for mediation')
    return {
      getGenerativeModel: () => ({
        generateContent: async (prompt: string) => ({
          response: {
            text: () => `Thank you for sharing the details of your situation. As your AI mediator, I can see there are important concerns on both sides that need to be addressed.

**Key Observations:**
• Both parties have legitimate interests that deserve consideration
• There appears to be some common ground that we can build upon
• Clear communication about expectations and concerns will be essential

**Suggested Next Steps:**
1. **Clarify Core Interests**: Each party should explain what outcomes are most important to them and why
2. **Explore Options**: Let's brainstorm potential solutions that could address everyone's key concerns
3. **Focus on Mutual Benefits**: Look for arrangements that create value for all parties involved

**Questions to Consider:**
• What would a successful resolution look like for each of you?
• Are there creative solutions that haven't been explored yet?
• What are the most important priorities that must be addressed?

I'm here to help facilitate productive dialogue and guide you toward a mutually beneficial resolution. Please continue sharing your thoughts and concerns.`
          }
        })
      })
    } as any
  }
  
  return new GoogleGenerativeAI(apiKey)
}

async function getServerUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user as AuthUser
}

// Validation functions
const isValidChatMessage = (msg: any): msg is MediationChatMessage => {
  return (
    msg &&
    typeof msg.content === 'string' &&
    msg.content.trim().length > 0 &&
    typeof msg.sender_name === 'string' &&
    msg.sender_name.trim().length > 0 &&
    ['user', 'ai_mediator'].includes(msg.sender_type)
  )
}

const validateMediationRequest = (body: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!body.caseId || typeof body.caseId !== 'string') {
    errors.push('Valid case ID is required')
  }

  if (!Array.isArray(body.chatHistory)) {
    errors.push('Chat history must be an array')
  } else {
    const invalidMessages = body.chatHistory.filter((msg: any) => !isValidChatMessage(msg))
    if (invalidMessages.length > 0) {
      errors.push('Invalid message format in chat history')
    }
  }

  return { isValid: errors.length === 0, errors }
}

async function handleMediationRequest(request: NextRequest, apiContext: ApiContext): Promise<NextResponse> {
  try {
    // Check authentication
    const user = await getServerUser()
    if (!user) {
      logger.authFailure('Missing authentication for mediation request', {
        requestId: apiContext.requestId,
        ip: apiContext.ip
      })
      
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 401 })
    }

    // Update context with user ID
    apiContext.userId = user.id
    
    logger.info('Processing mediation request', {
      requestId: apiContext.requestId,
      userId: user.id
    })

    const requestBody: MediationApiRequest = await request.json()
    const { caseId, chatHistory, context } = requestBody

    // Validate request
    const validation = validateMediationRequest(requestBody)
    if (!validation.isValid) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: validation.errors.join(', '),
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Initialize AI with error handling
    let genAI: GoogleGenerativeAI
    try {
      genAI = initializeAI()
    } catch (error) {
      console.error('AI initialization error:', error)
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'AI service configuration error',
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Process and validate chat history
    const processedHistory = chatHistory
      .filter(isValidChatMessage)
      .slice(-15) // Limit to last 15 messages for context management

    if (processedHistory.length === 0) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'No valid messages found in chat history',
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Prepare the context from chat history with better formatting
    const conversationContext = processedHistory.length > 0
      ? processedHistory
          .map(msg => {
            const role = msg.sender_type === 'ai_mediator' ? '[AI Mediator]' : '[Participant]'
            return `${role} ${msg.sender_name}: ${msg.content.trim()}`
          })
          .join('\n\n')
      : 'No previous conversation history available.'

    // Enhanced mediation prompt with context
    let mediationPrompt = `You are an AI mediator helping to resolve a dispute between parties. Your role is to provide neutral, constructive guidance to help parties reach a mutually beneficial resolution.

CORE PRINCIPLES:
1. Remain completely neutral and impartial - never favor any party
2. Help parties understand each other's perspectives and underlying interests
3. Identify common ground and shared goals
4. Suggest practical, fair solutions that benefit all parties
5. Encourage respectful, productive communication
6. Focus on interests and needs, not rigid positions

MEDIATION GUIDELINES:
- Ask clarifying questions to understand underlying concerns
- Reframe positions as interests when appropriate
- Suggest compromises and creative solutions
- Acknowledge emotions while redirecting to constructive dialogue
- Encourage direct communication between parties
- Maintain a calm, professional, and empathetic tone
- Provide specific, actionable next steps`

    // Add context if available
    if (context?.caseTitle) {
      mediationPrompt += `\n\nCASE TITLE: ${context.caseTitle}`
    }
    
    if (context?.caseDescription) {
      mediationPrompt += `\n\nCASE DESCRIPTION: ${context.caseDescription}`
    }

    mediationPrompt += `

CONVERSATION CONTEXT:
${conversationContext}

TASK: Based on this conversation, provide mediation guidance that helps the parties move toward resolution. Focus on:
1. Key issues that need addressing
2. Common ground or shared interests you observe
3. Specific suggestions for moving forward constructively
4. Questions that might help clarify important points

Keep your response helpful and concise (2-3 paragraphs), focusing on the most important insights and next steps.`

    const generationConfig: GeminiGenerationConfig = {
      temperature: 0.7,
      topP: 0.8,
      maxOutputTokens: 1000,
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig
    })

    logger.aiRequest('gemini-mediation', {
      requestId: apiContext.requestId,
      userId: user.id,
      caseId,
      historyLength: processedHistory.length
    })

    const result = await measureAsync(
      'gemini_mediation',
      () => model.generateContent(mediationPrompt),
      { requestId: apiContext.requestId, userId: user.id, caseId }
    )

    const response = result.response
    const text = response.text()
    const processingTime = Date.now() - apiContext.startTime

    logger.aiResponse('gemini-mediation', processingTime, {
      requestId: apiContext.requestId,
      userId: user.id,
      caseId,
      responseLength: text.length
    })

    // Validate AI response
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from AI service')
    }

    const mediationResponse: MediationApiResponse = {
      response: text.trim(),
      caseId,
      timestamp: new Date().toISOString(),
      metadata: {
        model: 'gemini-1.5-flash',
        processingTime,
        contextLength: processedHistory.length
      }
    }

    return NextResponse.json({
      success: true,
      data: mediationResponse,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.aiError('gemini-mediation', error as Error, {
      requestId: apiContext.requestId,
      userId: apiContext.userId
    })
    
    // Determine the case ID for fallback response
    let fallbackCaseId = 'unknown'
    try {
      const body = await request.json()
      fallbackCaseId = body.caseId || 'unknown'
    } catch {
      // If we can't parse the request body, use 'unknown'
    }
    
    // Enhanced fallback response with more specific guidance
    const fallbackResponse = `I apologize, but I'm currently unable to provide AI mediation assistance due to a technical issue.

While we work to resolve this, here are some general mediation principles that may help:

**For productive dialogue:**
- Listen actively to understand each other's underlying concerns and interests
- Focus on finding solutions that work for everyone involved
- Ask clarifying questions: "Help me understand why this is important to you"
- Look for common ground and shared goals

**If discussions become difficult:**
- Take breaks when emotions run high
- Acknowledge each other's feelings and perspectives
- Separate the people from the problem
- Consider what outcomes would truly benefit all parties

Please try requesting AI mediation assistance again in a few moments, or continue your discussion using these principles.`

    const fallbackMediationResponse: MediationApiResponse = {
      response: fallbackResponse,
      caseId: fallbackCaseId,
      timestamp: new Date().toISOString(),
      metadata: {
        model: 'fallback',
        processingTime: 0
      }
    }

    // Return 200 status with fallback content rather than error status
    // This ensures the UI can still display helpful guidance
    return NextResponse.json({
      success: true,
      data: fallbackMediationResponse,
      timestamp: new Date().toISOString()
    })
  }
}

// Export the wrapped handler with AI rate limiting
export const POST = withRateLimit(handleMediationRequest, 'ai')