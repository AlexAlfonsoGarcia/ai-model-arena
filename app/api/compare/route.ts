// app/api/compare/route.ts
// Comparison API Route - exposes the ComparisonOrchestrator through a REST endpoint
import { NextRequest, NextResponse } from 'next/server';
import { comparisonOrchestrator } from '../../../lib/ai/orchestrator';
import { GenerateRequest, ModelId } from '../../../lib/ai/types';
import { getModelById } from '../../../lib/ai/catalog';

/**
 * Validate the incoming request body for the compare endpoint
 */
function validateCompareRequest(body: unknown): { prompt: string; modelIds: string[] } | { error: string; status: number } {
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

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Validate request
    const validationResult = validateCompareRequest(body);
    if ('error' in validationResult) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status }
      );
    }

    const { prompt, modelIds } = validationResult;

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