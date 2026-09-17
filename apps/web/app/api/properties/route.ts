import { NextResponse } from 'next/server';
import { listPublicProperties } from '../../../lib/property-persistence';

export async function GET() {
    const properties = await listPublicProperties();
    return NextResponse.json({ properties });
}
