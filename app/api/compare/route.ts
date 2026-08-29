// app/api/compare/route.ts
// Comparison API Route - exposes the ComparisonOrchestrator through a REST endpoint
import { NextRequest } from 'next/dist/server/web/spec-extension/request';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { comparisonOrchestrator } from '../../../lib/ai/orchestrator';
import { GenerateRequest, ModelId } from '../../../lib/ai/types';
import { getModelById } from '../../../lib/ai/catalog';

// Rate limiting configuration
export const RATE_LIMIT_MAX_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// In-memory store for rate tracking with weighted costs and cleanup mechanism
// Structure: Map<ip, { requests: { timestamp: number, cost: number }[], lastCleanup: number }>
const requestTimestamps = new Map<
  string,
  { requests: { timestamp: number; cost: number }[]; lastCleanup: number }
>();

const CLEANUP_INTERVAL_MS = 60 * 1000; // Cleanup every minute
let lastGlobalCleanup = Date.now();

/**
 * Cleanup expired entries from the rate limiter
 * Called periodically to prevent memory growth
 */
function cleanupRateLimiter() {
  const now = Date.now();

  // Only run cleanup if enough time has passed
  if (now - lastGlobalCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastGlobalCleanup = now;

  for (const [ip, data] of requestTimestamps.entries()) {
    const validRequests = data.requests.filter(
      ({ timestamp }) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    if (validRequests.length === 0) {
      // Remove IP entry if no valid requests remain
      requestTimestamps.delete(ip);
    } else {
      // Update with cleaned requests
      data.requests = validRequests;
      data.lastCleanup = now;
    }
  }
}

/**
 * Extract client IP address from request
 * Works with Vercel and common deployment scenarios
 */
export function getIP(request: NextRequest): string {
  // Check for IP in common headers
  const headers = request.headers;
  let forwarded = '';
  if (headers) {
    forwarded = headers.get('x-forwarded-for') || '';
  }
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  // Alternative headers
  let realIp = '';
  if (headers) {
    realIp = headers.get('x-real-ip') || '';
  }
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to unknown if no IP can be determined
  return 'unknown';
}

/**
 * Validate the incoming request body for the compare endpoint
 */
export function validateCompareRequest(body: unknown): { prompt: string; modelIds: string[] } | { error: string; status: number } {
  // Check if body is an object
  if (body === null || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object', status: 400 };
  }

  const { prompt, modelIds } = body as { prompt?: unknown; modelIds?: unknown };

  // Validate prompt
  if (prompt === undefined || prompt === null) {
    return { error: 'Missing required field: prompt', status: 400 };
  }

  if (typeof prompt !== 'string') {
    return { error: 'Field "prompt" must be a string', status: 400 };
  }

  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt === '') {
    return { error: 'Field "prompt" must not be empty', status: 400 };
  }

  if (trimmedPrompt.length > 10000) {
    return { error: 'Field "prompt" must not exceed 10,000 characters', status: 400 };
  }

  // Validate modelIds
  if (modelIds === undefined || modelIds === null) {
    return { error: 'Missing required field: modelIds', status: 400 };
  }

  if (!Array.isArray(modelIds)) {
    return { error: 'Field "modelIds" must be an array', status: 400 };
  }

  if (modelIds.length === 0) {
    return { error: 'Field "modelIds" must contain at least one model ID', status: 400 };
  }

  if (modelIds.length > 3) {
    return { error: 'Field "modelIds" must not contain more than 3 model IDs', status: 400 };
  }

  // Validate each modelId
  for (const modelId of modelIds) {
    if (typeof modelId !== 'string') {
      return { error: 'Each model ID must be a string', status: 400 };
    }

    const trimmedModelId = modelId.trim();
    if (trimmedModelId === '') {
      return { error: 'Model ID must not be empty', status: 400 };
    }

    // Check if model exists in catalog
    const model = getModelById(trimmedModelId as ModelId);
    if (!model) {
      return { error: `Unknown model ID: ${modelId}`, status: 400 };
    }
  }

  return { prompt: trimmedPrompt, modelIds: modelIds.map(id => id.trim()) };
}

/**
 * Calculate request cost for weighted rate limiting
 * Based on number of models (more models = higher cost)
 */
function calculateRequestCost(modelIds: string[]): number {
  // Base cost of 1 + additional cost for each model beyond the first
  // This makes: 1 model = 1 cost, 2 models = 2 cost, 3 models = 3 cost
  return modelIds.length;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Periodic cleanup to prevent memory growth
  cleanupRateLimiter();

  try {
    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request FIRST - invalid requests should not consume rate limit
    const validationResult = validateCompareRequest(body);
    if ('error' in validationResult) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status }
      );
    }

    const { prompt, modelIds } = validationResult;

    // Calculate request cost for weighted rate limiting
    const requestCost = calculateRequestCost(modelIds);

    // Rate limiting check AFTER validation
    const ip = getIP(request);
    const now = Date.now();

    // Initialize or get existing data for this IP
    if (!requestTimestamps.has(ip)) {
      requestTimestamps.set(ip, { requests: [], lastCleanup: now });
    }
    const ipData = requestTimestamps.get(ip)!;
    const requests = ipData.requests;

    // Remove requests older than the window
    const validRequests = requests.filter(
      ({ timestamp }) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    // Calculate current weighted usage
    const currentWeightedUsage = validRequests.reduce((sum, { cost }) => sum + cost, 0);

    // Check if rate limit exceeded (weighted)
    if (currentWeightedUsage + requestCost > RATE_LIMIT_MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Add current request with its cost and store back
    validRequests.push({ timestamp: now, cost: requestCost });
    ipData.requests = validRequests;
    ipData.lastCleanup = now;
    requestTimestamps.set(ip, ipData);

    try {
      // Transform to GenerateRequest[] for orchestrator
      const generateRequests: GenerateRequest[] = modelIds.map(modelId => ({
        prompt,
        modelId: modelId as ModelId
      }));

      // Execute comparison using existing orchestrator
      const results = await comparisonOrchestrator.compare(generateRequests);

      // Return successful response
      return NextResponse.json({ results }, { status: 200 });
    } catch (error) {
      // Handle unexpected server errors
      console.error('Unexpected error in compare API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  } catch (error) {
    // Handle unexpected server errors
    console.error('Unexpected error in compare API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Explicitly handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405 }
  );
}

export async function HEAD() {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405 }
  );
}

export async function OPTIONS() {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405 }
  );
}