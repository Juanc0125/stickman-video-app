'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import type { LogoPosition } from '@shared-types/video';
import { updateBranding, uploadLogo, type BrandingPatch, type VideoRecord } from './api';
import { LOGO_POSITION_OPTIONS } from './constants';

interface BrandingPanelProps {
    video: VideoRecord;
    onUpdated: (video: VideoRecord) => void;
}

const ACCEPTED_LOGO_TYPES = 'image/png,image/jpeg,image/webp,image/svg+xml';

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });
}

export default function BrandingPanel({ video, onUpdated }: BrandingPanelProps) {
    const branding = video.branding;
    const [primaryColor, setPrimaryColor] = useState(branding.primary_color);
    const [secondaryColor, setSecondaryColor] = useState(branding.secondary_color);
    const [fontFamily, setFontFamily] = useState(branding.font_family);
    const [logoPosition, setLogoPosition] = useState<LogoPosition>(branding.logo_position);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const dirty =
        primaryColor !== branding.primary_color ||
        secondaryColor !== branding.secondary_color ||
        fontFamily !== branding.font_family ||
        logoPosition !== branding.logo_position;

    async function handleSaveBranding() {
        if (!fontFamily.trim()) {
            setSaveError('La tipografía no puede quedar vacía.');
            return;
        }
        const patch: BrandingPatch = {};
        if (primaryColor !== branding.primary_color) patch.primary_color = primaryColor;
        if (secondaryColor !== branding.secondary_color) patch.secondary_color = secondaryColor;
        if (fontFamily !== branding.font_family) patch.font_family = fontFamily;
        if (logoPosition !== branding.logo_position) patch.logo_position = logoPosition;

        if (Object.keys(patch).length === 0) return;

        setSaving(true);
        setSaveError('');
        try {
            const updated = await updateBranding(video.id, patch);
            onUpdated(updated);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el branding.');
        } finally {
            setSaving(false);
        }
    }

    async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError('');
        try {
            const dataUrl = await readFileAsDataUrl(file);
            const result = await uploadLogo(video.id, dataUrl);
            onUpdated(result.video);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'No se pudo subir el logo.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    return (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Marca (branding)</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="primary-color">Color primario</label>
                    <div className="flex items-center gap-2">
                        <input
                            id="primary-color"
                            type="color"
                            value={primaryColor}
                            onChange={(event) => setPrimaryColor(event.target.value)}
                            disabled={saving}
                            className="h-9 w-14 cursor-pointer rounded border border-gray-300"
                        />
                        <span className="text-sm text-gray-500">{primaryColor}</span>
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="secondary-color">Color secundario</label>
                    <div className="flex items-center gap-2">
                        <input
                            id="secondary-color"
                            type="color"
                            value={secondaryColor}
                            onChange={(event) => setSecondaryColor(event.target.value)}
                            disabled={saving}
                            className="h-9 w-14 cursor-pointer rounded border border-gray-300"
                        />
                        <span className="text-sm text-gray-500">{secondaryColor}</span>
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="font-family">Tipografía</label>
                    <input
                        id="font-family"
                        type="text"
                        value={fontFamily}
                        onChange={(event) => setFontFamily(event.target.value)}
                        disabled={saving}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="logo-position">Posición del logo</label>
                    <select
                        id="logo-position"
                        value={logoPosition}
                        onChange={(event) => setLogoPosition(event.target.value as LogoPosition)}
                        disabled={saving}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                    >
                        {LOGO_POSITION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
            <div className="mt-3">
                <button
                    type="button"
                    onClick={handleSaveBranding}
                    disabled={saving || !dirty}
                    className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Guardar cambios de marca'}
                </button>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
                <label className="mb-1 block text-sm font-medium" htmlFor="logo-upload">Logo</label>
                {branding.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- external/base64-derived Supabase Storage URL, not a static local asset.
                    <img src={branding.logo_url} alt="Logo actual de la marca" className="mb-2 h-16 w-auto rounded border border-gray-200 bg-gray-50 object-contain p-1" />
                )}
                <input
                    id="logo-upload"
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_LOGO_TYPES}
                    onChange={handleLogoChange}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                />
                <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP o SVG. Máximo 2MB.</p>
                {uploading && <p className="mt-1 text-sm text-gray-500">Subiendo logo...</p>}
                {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
            </div>
        </section>
    );
}
