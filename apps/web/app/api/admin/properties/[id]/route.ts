import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../lib/admin-auth';
import { deleteProperty, updateProperty, validatePropertyInput } from '../../../../../lib/property-persistence';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    try {
        const input = validatePropertyInput(body, { partial: true });
        const property = await updateProperty(id, input);
        return NextResponse.json({ property });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar la propiedad.' }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const { id } = await context.params;
    try {
        await deleteProperty(id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo eliminar la propiedad.' }, { status: 400 });
    }
}
