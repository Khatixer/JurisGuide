import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, type ApiContext } from '@/lib/utils/api-middleware'
import { logger } from '@/lib/utils/logger'
import { measureAsync } from '@/lib/utils/performance'
import type { 
  GuidanceApiRequest, 
  GuidanceApiResponse, 
  GuidanceStreamChunk,
  ApiErrorResponse,
  GeminiGenerationConfig 
} from '@/types/api'
import type { AuthUser } from '@/types'

async function getServerUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user as AuthUser
}

// Initialize Google Gemini AI with fallback for dummy keys
function createGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY!
  
  // Check if we're using a dummy API key
  if (apiKey.includes('DummyKeyForTestingPurposesOnly')) {
    console.log('🔧 Using mock Gemini AI for development')
    return {
      getGenerativeModel: () => ({
        generateContent: async (prompt: string) => ({
          response: {
            text: () => `**Legal Information Disclaimer**: I'm providing general legal information only, not legal advice. Please consult with a qualified attorney for specific legal advice.

Based on your question, here are some general legal considerations:

• **Understanding Your Rights**: In most legal systems, parties have certain fundamental rights that are protected by law.

• **Legal Processes**: There are established procedures for addressing legal disputes and concerns.

• **Documentation**: Keeping proper records and documentation is typically important in legal matters.

• **Professional Consultation**: Given the complexity of legal issues, consulting with a qualified legal professional in your jurisdiction is strongly recommended.

• **Jurisdiction Matters**: Laws vary significantly between different countries and regions, so local legal expertise is crucial.

**Next Steps**: I recommend consulting with a licensed attorney who can provide specific advice based on your situation and applicable laws in your jurisdiction.

*This is general information only and should not be considered legal advice.*`
          }
        }),
        generateContentStream: async function* (prompt: string) {
          const response = `**Legal Information Disclaimer**: I'm providing general legal information only, not legal advice. Please consult with a qualified attorney for specific legal advice.

Based on your question, here are some general legal considerations:

• **Understanding Your Rights**: In most legal systems, parties have certain fundamental rights that are protected by law.

• **Legal Processes**: There are established procedures for addressing legal disputes and concerns.

• **Documentation**: Keeping proper records and documentation is typically important in legal matters.

• **Professional Consultation**: Given the complexity of legal issues, consulting with a qualified legal professional in your jurisdiction is strongly recommended.

• **Jurisdiction Matters**: Laws vary significantly between different countries and regions, so local legal expertise is crucial.

**Next Steps**: I recommend consulting with a licensed attorney who can provide specific advice based on your situation and applicable laws in your jurisdiction.

*This is general information only and should not be considered legal advice.*`
          
          const chunks = response.split(' ')
          for (const chunk of chunks) {
            yield { text: () => chunk + ' ' }
            await new Promise(resolve => setTimeout(resolve, 50)) // Simulate streaming delay
          }
        }
      })
    }
  }
  
  return new GoogleGenerativeAI(apiKey)
}

const genAI = createGeminiClient()

const LEGAL_GUIDANCE_PROMPT = `You are a neutral AI legal information assistant. Your role is to provide general legal information and guidance, not legal advice. Follow these guidelines:

1. Always clarify that you provide general legal information, not legal advice
2. Encourage users to consult with qualified legal professionals for specific legal advice
3. Be neutral, objective, and informative
4. Explain legal concepts in clear, understandable language
5. Provide relevant information about legal processes, rights, and obligations
6. Suggest when professional legal consultation would be beneficial
7. Never provide specific legal advice or recommendations for specific cases
8. Always remind users that laws vary by jurisdiction

When responding to legal questions:
- Start with a disclaimer about providing general information only
- Explain relevant legal concepts and principles
- Mention potential legal considerations
- Suggest consulting with a qualified attorney for specific advice
- Be helpful while maintaining appropriate boundaries`

async function handleGuidanceRequest(request: NextRequest, apiContext: ApiContext): Promise<NextResponse> {
  try {
    // Check authentication
    const user = await getServerUser()
    if (!user) {
      logger.authFailure('Missing authentication for guidance request', {
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
    
    logger.info('Processing guidance request', {
      requestId: apiContext.requestId,
      userId: user.id
    })

    const requestBody: GuidanceApiRequest = await request.json()
    const { question, stream, context } = requestBody

    // Validate request
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Valid question is required',
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    if (question.length > 2000) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Question is too long (maximum 2000 characters)',
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'AI service configuration error',
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Initialize AI with proper configuration
    const genAI = new GoogleGenerativeAI(apiKey)
    
    const generationConfig: GeminiGenerationConfig = {
      temperature: 0.7,
      topP: 0.8,
      maxOutputTokens: 2000,
    }

    // Get the generative model with configuration
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig
    })

    // Create enhanced prompt with context
    let contextualPrompt = LEGAL_GUIDANCE_PROMPT
    
    if (context?.userRole) {
      contextualPrompt += `\n\nUser Role: ${context.userRole}`
    }
    
    if (context?.jurisdiction) {
      contextualPrompt += `\n\nJurisdiction: ${context.jurisdiction}`
    }

    const fullPrompt = `${contextualPrompt}

User Question: ${question}

Please provide helpful legal information while following the guidelines above.`

    // Handle streaming response
    if (stream) {
      logger.aiRequest('gemini-guidance-stream', {
        requestId: apiContext.requestId,
        userId: user.id,
        questionLength: question.length
      })

      const result = await measureAsync(
        'gemini_guidance_stream',
        () => model.generateContentStream(fullPrompt),
        { requestId: apiContext.requestId, userId: user.id }
      )
      
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text()
              const streamChunk: GuidanceStreamChunk = { chunk: chunkText }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamChunk)}\n\n`))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            const errorChunk: GuidanceStreamChunk = { 
              chunk: 'I apologize, but I encountered an error while processing your question. Please try again.',
              isComplete: true
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        }
      })

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    // Handle regular response
    logger.aiRequest('gemini-guidance', {
      requestId: apiContext.requestId,
      userId: user.id,
      questionLength: question.length
    })

    const result = await measureAsync(
      'gemini_guidance',
      () => model.generateContent(fullPrompt),
      { requestId: apiContext.requestId, userId: user.id }
    )

    const response = result.response
    const text = response.text()
    const processingTime = Date.now() - apiContext.startTime

    logger.aiResponse('gemini-guidance', processingTime, {
      requestId: apiContext.requestId,
      userId: user.id,
      responseLength: text.length
    })

    if (!text || text.trim().length === 0) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Empty response from AI service',
        timestamp: new Date().toISOString()
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    const guidanceResponse: GuidanceApiResponse = {
      response: text,
      timestamp: new Date().toISOString(),
      metadata: {
        model: 'gemini-1.5-flash',
        processingTime
      }
    }

    return NextResponse.json({
      success: true,
      data: guidanceResponse,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.aiError('gemini-guidance', error as Error, {
      requestId: apiContext.requestId,
      userId: apiContext.userId
    })
    
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Failed to process your question. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Export the wrapped handler with AI rate limiting
export const POST = withRateLimit(handleGuidanceRequest, 'ai')