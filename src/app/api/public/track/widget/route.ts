/**
 * POST /api/public/track/widget
 * 
 * Tracks widget embed loads for analytics.
 * No API key required - tracking should be frictionless.
 * Records widget type, referrer domain, user agent for growth tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// CORS headers for cross-origin widget embeds
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, referrer } = body;

    // Validate widget type
    if (!type || !['avm', 'heatmap'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid widget type. Must be "avm" or "heatmap"' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Extract domain from referrer URL
    let domain: string | null = null;
    if (referrer && typeof referrer === 'string') {
      try {
        const url = new URL(referrer);
        domain = url.hostname;
      } catch {
        // Invalid URL, keep domain as null
      }
    }

    // Extract user agent
    const userAgent = req.headers.get('user-agent') || undefined;

    // TODO: Add country detection via IP geolocation (optional enhancement)
    // For now, we'll leave country as null
    const country: string | null = null;

    // Create EmbedUsage record
    await prisma.embedUsage.create({
      data: {
        widgetType: type,
        referrer: referrer || null,
        domain,
        userAgent,
        country,
      },
    });

    return NextResponse.json(
      { ok: true },
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store', // Don't cache tracking requests
        }
      }
    );
  } catch (error) {
    console.error('Widget tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track widget load' },
      { status: 500, headers: corsHeaders }
    );
  }
}
