/**
 * Next.js API Route for DeFi Llama Yields
 *
 * Proxies requests to DeFi Llama API to bypass CORS restrictions
 * API endpoint: /api/yields
 */

import { NextResponse } from 'next/server';

const DEFILLAMA_API = 'https://yields.llama.fi/pools';

// Cache the response for 5 minutes to reduce API load
let cache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Check cache first
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      console.log('✅ Returning cached DeFi Llama data');
      return NextResponse.json(cache.data);
    }

    console.log('🔍 Fetching fresh data from DeFi Llama...');

    const response = await fetch(DEFILLAMA_API, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DeFi Llama API returned ${response.status}`);
    }

    const data = await response.json();

    // Update cache
    cache = {
      data,
      timestamp: Date.now(),
    };

    console.log(`✅ Fetched ${data.data?.length || 0} pools from DeFi Llama`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Error fetching from DeFi Llama:', error.message);

    return NextResponse.json(
      {
        error: 'Failed to fetch yields',
        message: error.message,
        status: 'error'
      },
      { status: 500 }
    );
  }
}

// Disable Next.js caching to ensure our custom cache works
export const dynamic = 'force-dynamic';
