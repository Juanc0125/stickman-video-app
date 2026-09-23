import { NextResponse } from 'next/server';
import { deleteBrandTemplate } from '../../../../lib/brand-templates';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
    const { id } = await context.params;

    try {
        const deleted = await deleteBrandTemplate(id);
        if (!deleted) {
            return NextResponse.json({ error: 'Plantilla de marca no encontrada.' }, { status: 404 });
        }
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error al eliminar la plantilla de marca', error);
        return NextResponse.json({ error: 'No se pudo eliminar la plantilla de marca.' }, { status: 500 });
    }
}
