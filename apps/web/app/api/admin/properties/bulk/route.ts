import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../lib/admin-auth';
import { bulkCreateProperties, validatePropertyInput, type PropertyInput } from '../../../../../lib/property-persistence';

export async function POST(request: NextRequest) {
    if (!isAdminRequest(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const body = await request.json().catch(() => null) as { rows?: unknown[] } | null;
    if (!body?.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
        return NextResponse.json({ error: 'Formato invalido: se espera { rows: [...] } con al menos una fila.' }, { status: 400 });
    }
    if (body.rows.length > 500) {
        return NextResponse.json({ error: 'Maximo 500 filas por importacion.' }, { status: 400 });
    }

    const valid: PropertyInput[] = [];
    const rowErrors: string[] = [];

    body.rows.forEach((row, index) => {
        try {
            valid.push(validatePropertyInput(row) as PropertyInput);
        } catch (error) {
            rowErrors.push(`Fila ${index + 2}: ${error instanceof Error ? error.message : 'dato invalido'}`);
        }
    });

    if (valid.length === 0) {
        return NextResponse.json({ error: 'Ninguna fila fue valida.', rowErrors }, { status: 400 });
    }

    try {
        const created = await bulkCreateProperties(valid);
        return NextResponse.json({ created, count: created.length, rowErrors });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo importar.' }, { status: 500 });
    }
}
