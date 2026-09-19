import { NextResponse } from 'next/server';
import type { Branding, LogoPosition } from '@shared-types/video';
import { getVideo, updateBranding } from '../../../../../lib/video-persistence';

type RouteContext = { params: Promise<{ id: string }> };

type BrandingPatchBody = {
    logo_url?: unknown;
    logo_position?: unknown;
    primary_color?: unknown;
    secondary_color?: unknown;
    font_family?: unknown;
};

const LOGO_POSITIONS: LogoPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as BrandingPatchBody | null;

    if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'El cuerpo de la solicitud es invalido.' }, { status: 400 });
    }

    if (body.logo_url !== undefined) {
        return NextResponse.json(
            { error: 'Usa el endpoint /api/videos/[id]/logo para configurar logo_url.' },
            { status: 400 },
        );
    }

    const patch: Partial<Branding> = {};

    if (body.logo_position !== undefined) {
        if (typeof body.logo_position !== 'string' || !LOGO_POSITIONS.includes(body.logo_position as LogoPosition)) {
            return NextResponse.json(
                { error: 'logo_position debe ser uno de: top-left, top-right, bottom-left, bottom-right.' },
                { status: 400 },
            );
        }
        patch.logo_position = body.logo_position as LogoPosition;
    }

    if (body.primary_color !== undefined) {
        if (typeof body.primary_color !== 'string' || !HEX_COLOR_PATTERN.test(body.primary_color)) {
            return NextResponse.json(
                { error: 'primary_color debe ser un color hexadecimal valido, por ejemplo #17202a.' },
                { status: 400 },
            );
        }
        patch.primary_color = body.primary_color;
    }

    if (body.secondary_color !== undefined) {
        if (typeof body.secondary_color !== 'string' || !HEX_COLOR_PATTERN.test(body.secondary_color)) {
            return NextResponse.json(
                { error: 'secondary_color debe ser un color hexadecimal valido, por ejemplo #ffffff.' },
                { status: 400 },
            );
        }
        patch.secondary_color = body.secondary_color;
    }

    if (body.font_family !== undefined) {
        if (typeof body.font_family !== 'string' || body.font_family.trim().length === 0) {
            return NextResponse.json({ error: 'font_family debe ser un texto no vacio.' }, { status: 400 });
        }
        patch.font_family = body.font_family;
    }

    const video = await getVideo(id);
    if (!video) {
        return NextResponse.json({ error: 'Video no encontrado.' }, { status: 404 });
    }

    try {
        const updated = await updateBranding(id, patch);
        return NextResponse.json({ video: updated }, { status: 200 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        const status = message === 'Video no encontrado.' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
