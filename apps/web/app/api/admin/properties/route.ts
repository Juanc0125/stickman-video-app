import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../lib/admin-auth';
import { createProperty, listAllProperties, validatePropertyInput } from '../../../../lib/property-persistence';

export async function GET(request: NextRequest) {
    if (!isAdminRequest(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    const properties = await listAllProperties();
    return NextResponse.json({ properties });
}

export async function POST(request: NextRequest) {
    if (!isAdminRequest(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const body = await request.json().catch(() => null);
    try {
        const input = validatePropertyInput(body);
        const property = await createProperty(input);
        return NextResponse.json({ property }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo crear la propiedad.' }, { status: 400 });
    }
}
