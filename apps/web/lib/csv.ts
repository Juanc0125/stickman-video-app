// Dependency-free RFC4180-ish CSV parser: handles quoted fields, escaped
// quotes ("") inside quotes, and commas/newlines within quoted fields.
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') { field += '"'; i += 1; }
            else if (char === '"') { inQuotes = false; }
            else { field += char; }
            continue;
        }

        if (char === '"') { inQuotes = true; }
        else if (char === ',') { row.push(field); field = ''; }
        else if (char === '\r') { /* ignore, \n handles the line break */ }
        else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else { field += char; }
    }

    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter((entries) => entries.some((entry) => entry.trim() !== ''));
}

const PROPERTY_COLUMNS = ['title', 'location', 'price', 'type', 'beds', 'baths', 'area', 'image', 'tag', 'stock', 'status'] as const;

export function csvToPropertyRows(text: string): Record<string, string>[] {
    const rows = parseCsv(text);
    if (rows.length < 2) return [];

    const header = rows[0].map((cell) => cell.trim().toLowerCase());
    const columnIndex = new Map(PROPERTY_COLUMNS.map((column) => [column, header.indexOf(column)]));

    return rows.slice(1).map((cells) => {
        const record: Record<string, string> = {};
        for (const column of PROPERTY_COLUMNS) {
            const index = columnIndex.get(column);
            if (index !== undefined && index >= 0 && cells[index] !== undefined) {
                record[column] = cells[index].trim();
            }
        }
        return record;
    });
}
