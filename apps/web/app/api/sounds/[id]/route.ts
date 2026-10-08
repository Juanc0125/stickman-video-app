import { NextResponse } from 'next/server';
import { deleteUploadedSound } from '../../../../lib/sounds';

type RouteContext = { params: Promise<{ id: string }> };

function decodeId(raw: string): string {
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    // The id carries a colon (subido:<uuid>), which a client may or may not
    // percent-encode; both spellings are accepted.
    const id = decodeId((await context.params).id);

    if (id.startsWith('biblioteca:')) {
        return NextResponse.json({ error: 'Los sonidos de la biblioteca no se pueden eliminar.' }, { status: 400 });
    }

    try {
        const result = await deleteUploadedSound(id);
        if (result === 'id_invalido') {
            return NextResponse.json({ error: 'El identificador del sonido no es valido.' }, { status: 400 });
        }
        if (result === 'no_encontrado') {
            return NextResponse.json({ error: 'Sonido no encontrado.' }, { status: 404 });
        }
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error al eliminar el sonido', error);
        return NextResponse.json({ error: 'No se pudo eliminar el sonido.' }, { status: 500 });
    }
}
