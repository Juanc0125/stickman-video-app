import type { Property, PropertyStatus } from '@shared-types/property';
import { getSupabaseClient } from './supabaseClient';

type DatabaseRow = Record<string, unknown>;

export type PropertyInput = {
    title: string;
    location: string;
    price: number;
    type: string;
    beds: number;
    baths: number;
    area: number;
    image: string;
    tag: string;
    stock: number;
    status: PropertyStatus;
};

const STATUSES: PropertyStatus[] = ['activa', 'reservada', 'vendida', 'arrendada'];

// Seed data so the catalog never looks empty in demo mode (no Supabase configured).
const seedProperties: Property[] = [
    { id: 'urq-01', title: 'Casa Patio del Prado', location: 'Chapinero Alto, Bogotá', price: 1680000000, type: 'Casa', beds: 4, baths: 3, area: 245, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85', tag: 'Selección Urquijo', stock: 1, status: 'activa', created_at: new Date().toISOString() },
    { id: 'urq-02', title: 'Apartamento Brisa Norte', location: 'El Poblado, Medellín', price: 895000000, type: 'Apartamento', beds: 3, baths: 2, area: 128, image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85', tag: 'Nuevo', stock: 1, status: 'activa', created_at: new Date().toISOString() },
    { id: 'urq-03', title: 'Loft 72 / 14', location: 'Zona G, Bogotá', price: 620000000, type: 'Loft', beds: 2, baths: 2, area: 86, image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85', tag: 'Listo para habitar', stock: 1, status: 'activa', created_at: new Date().toISOString() },
    { id: 'urq-04', title: 'Villa Agua Clara', location: 'Rionegro, Antioquia', price: 1240000000, type: 'Casa', beds: 5, baths: 4, area: 310, image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=85', tag: 'Exclusiva', stock: 1, status: 'activa', created_at: new Date().toISOString() },
];

const globalStore = globalThis as typeof globalThis & {
    __stickmanProperties?: Map<string, Property>;
};

const mockProperties = globalStore.__stickmanProperties ??= new Map(seedProperties.map((property) => [property.id, property]));

function toProperty(row: DatabaseRow): Property {
    const status = String(row.status ?? 'activa');
    return {
        id: String(row.id),
        title: String(row.title ?? ''),
        location: String(row.location ?? ''),
        price: Number(row.price ?? 0),
        type: String(row.type ?? 'Casa'),
        beds: Number(row.beds ?? 0),
        baths: Number(row.baths ?? 0),
        area: Number(row.area ?? 0),
        image: String(row.image ?? ''),
        tag: String(row.tag ?? ''),
        stock: Number(row.stock ?? 0),
        status: (STATUSES.includes(status as PropertyStatus) ? status : 'activa') as PropertyStatus,
        created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    };
}

export function validatePropertyInput(body: unknown, options: { partial?: boolean } = {}): Partial<PropertyInput> {
    const source = (body ?? {}) as Record<string, unknown>;
    const result: Partial<PropertyInput> = {};

    const assignString = (key: keyof PropertyInput, required: boolean) => {
        const value = source[key];
        if (typeof value === 'string' && value.trim()) { (result as Record<string, unknown>)[key] = value.trim(); return; }
        if (required && !options.partial) throw new Error(`El campo "${key}" es obligatorio.`);
    };
    const assignNumber = (key: keyof PropertyInput, required: boolean) => {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value)) { (result as Record<string, unknown>)[key] = value; return; }
        if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) { (result as Record<string, unknown>)[key] = Number(value); return; }
        if (required && !options.partial) throw new Error(`El campo "${key}" es obligatorio y debe ser numerico.`);
    };

    assignString('title', true);
    assignString('location', true);
    assignNumber('price', true);
    assignString('type', true);
    assignNumber('beds', true);
    assignNumber('baths', true);
    assignNumber('area', true);
    assignString('image', true);
    assignString('tag', false);
    assignNumber('stock', true);

    if (typeof source.status === 'string') {
        if (!STATUSES.includes(source.status as PropertyStatus)) throw new Error('Estado invalido.');
        result.status = source.status as PropertyStatus;
    } else if (!options.partial) {
        result.status = 'activa';
    }

    return result;
}

export async function listPublicProperties(): Promise<Property[]> {
    const client = getSupabaseClient();
    if (!client) return Array.from(mockProperties.values()).filter((property) => property.status === 'activa' && property.stock > 0);

    try {
        const { data, error } = await client.from('properties').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map(toProperty);
    } catch (error) {
        console.warn('Fallo al leer propiedades desde Supabase, usando fallback en memoria.', error);
        return Array.from(mockProperties.values()).filter((property) => property.status === 'activa' && property.stock > 0);
    }
}

export async function listAllProperties(): Promise<Property[]> {
    const client = getSupabaseClient({ serviceRole: true });
    if (!client) return Array.from(mockProperties.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));

    try {
        const { data, error } = await client.from('properties').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map(toProperty);
    } catch (error) {
        console.warn('Fallo al leer propiedades (admin) desde Supabase, usando fallback en memoria.', error);
        return Array.from(mockProperties.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
}

function createInMemory(input: Partial<PropertyInput>): Property {
    const id = crypto.randomUUID();
    const property: Property = { ...input as PropertyInput, id, created_at: new Date().toISOString(), tag: input.tag ?? '' };
    mockProperties.set(id, property);
    return property;
}

export async function bulkCreateProperties(inputs: PropertyInput[]): Promise<Property[]> {
    const client = getSupabaseClient({ serviceRole: true });

    if (client) {
        try {
            const { data, error } = await client.from('properties').insert(inputs.map((input) => ({
                title: input.title,
                location: input.location,
                price: input.price,
                type: input.type,
                beds: input.beds,
                baths: input.baths,
                area: input.area,
                image: input.image,
                tag: input.tag ?? '',
                stock: input.stock,
                status: input.status ?? 'activa',
            }))).select();

            if (error) throw error;
            return (data ?? []).map(toProperty);
        } catch (error) {
            console.warn('Fallo la importacion masiva en Supabase, usando fallback en memoria.', error);
        }
    }

    return inputs.map((input) => createInMemory(input));
}

export async function createProperty(input: Partial<PropertyInput>): Promise<Property> {
    const parsed = input as PropertyInput;
    const client = getSupabaseClient({ serviceRole: true });

    if (client) {
        try {
            const { data, error } = await client.from('properties').insert({
                title: parsed.title,
                location: parsed.location,
                price: parsed.price,
                type: parsed.type,
                beds: parsed.beds,
                baths: parsed.baths,
                area: parsed.area,
                image: parsed.image,
                tag: parsed.tag ?? '',
                stock: parsed.stock,
                status: parsed.status ?? 'activa',
            }).select().single();

            if (error || !data) throw error ?? new Error('No se pudo crear la propiedad.');
            return toProperty(data);
        } catch (error) {
            console.warn('Fallo al crear la propiedad en Supabase, usando fallback en memoria.', error);
        }
    }

    return createInMemory(parsed);
}

export async function updateProperty(id: string, input: Partial<PropertyInput>): Promise<Property> {
    const client = getSupabaseClient({ serviceRole: true });

    if (client) {
        try {
            const { data, error } = await client.from('properties').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select().single();
            if (error || !data) throw error ?? new Error('No se pudo actualizar la propiedad.');
            return toProperty(data);
        } catch (error) {
            console.warn('Fallo al actualizar la propiedad en Supabase, usando fallback en memoria.', error);
        }
    }

    const existing = mockProperties.get(id);
    if (!existing) throw new Error('Propiedad no encontrada.');
    const updated = { ...existing, ...input };
    mockProperties.set(id, updated);
    return updated;
}

export async function deleteProperty(id: string): Promise<void> {
    const client = getSupabaseClient({ serviceRole: true });

    if (client) {
        try {
            const { error } = await client.from('properties').delete().eq('id', id);
            if (error) throw error;
            mockProperties.delete(id);
            return;
        } catch (error) {
            console.warn('Fallo al eliminar la propiedad en Supabase, usando fallback en memoria.', error);
        }
    }

    if (!mockProperties.delete(id)) throw new Error('Propiedad no encontrada.');
}
