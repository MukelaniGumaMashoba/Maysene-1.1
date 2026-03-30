import { NextRequest, NextResponse } from 'next/server'

type HttpMethodHandler = (request: NextRequest) => Promise<Response>

export function withErrorHandling(handler: HttpMethodHandler, context?: { route?: string }) {
  return async function wrappedHandler(request: NextRequest): Promise<Response> {
    const route = context?.route || 'unknown'
    const start = Date.now()
    try {
      console.log(`[API][${route}] Start`, {
        method: request.method,
        url: request.url
      })
      const response = await handler(request)
      const durationMs = Date.now() - start
      // Attempt to clone to peek status without consuming body
      const status = (response as Response).status
      console.log(`[API][${route}] Completed`, { status, durationMs })
      return response
    } catch (error: any) {
      const durationMs = Date.now() - start
      console.error(`[API][${route}] Unhandled error after ${durationMs}ms:`, error)
      const message = error?.message || 'Internal server error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}

