import { NextResponse } from 'next/server';
import { getOpenApiSpec } from '@/lib/openapi';

export async function GET() {
  const spec = getOpenApiSpec();
  return NextResponse.json(spec);
}
