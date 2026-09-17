export type PropertyStatus = 'activa' | 'reservada' | 'vendida' | 'arrendada';

export interface Property {
    id: string;
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
    created_at: string;
}
