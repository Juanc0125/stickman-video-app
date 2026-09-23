'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { BrandTemplate } from '@shared-types/templates';
import type { LogoPosition } from '@shared-types/video';
import {
    applyBrandTemplate, deleteBrandTemplate, fetchBrandTemplates, saveBrandTemplate,
    updateBranding, uploadLogo, type BrandingPatch, type VideoRecord,
} from './api';
import { FONT_OPTIONS, LOGO_POSITION_OPTIONS } from './constants';

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

    const [brandTemplates, setBrandTemplates] = useState<BrandTemplate[]>([]);
    const [templateName, setTemplateName] = useState('');
    const [templateError, setTemplateError] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

    const loadTemplates = useCallback(async () => {
        try {
            setBrandTemplates(await fetchBrandTemplates());
        } catch (err) {
            setTemplateError(err instanceof Error ? err.message : 'No se pudieron cargar las plantillas de marca.');
        }
    }, []);

    useEffect(() => {
        // Deferred by a tick: the state only changes once the fetch resolves,
        // but the lint rule sees a call inside the effect body and cannot tell.
        const timer = setTimeout(() => { void loadTemplates(); }, 0);
        return () => clearTimeout(timer);
    }, [loadTemplates]);

    const dirty =
        primaryColor !== branding.primary_color ||
        secondaryColor !== branding.secondary_color ||
        fontFamily !== branding.font_family ||
        logoPosition !== branding.logo_position;

    // Shared by the save button and by saving a template: a template captures
    // what is stored on the video, so pending edits have to land first or the
    // user would save a brand they cannot see.
    async function persistBranding() {
        const patch: BrandingPatch = {};
        if (primaryColor !== branding.primary_color) patch.primary_color = primaryColor;
        if (secondaryColor !== branding.secondary_color) patch.secondary_color = secondaryColor;
        if (fontFamily !== branding.font_family) patch.font_family = fontFamily;
        if (logoPosition !== branding.logo_position) patch.logo_position = logoPosition;
        if (Object.keys(patch).length === 0) return;

        const updated = await updateBranding(video.id, patch);
        onUpdated(updated);
    }

    async function handleSaveBranding() {
        if (!fontFamily.trim()) {
            setSaveError('La tipografía no puede quedar vacía.');
            return;
        }

        setSaving(true);
        setSaveError('');
        try {
            await persistBranding();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el branding.');
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveTemplate() {
        const name = templateName.trim();
        if (!name) {
            setTemplateError('Ponle un nombre a la plantilla, por ejemplo "Marca principal".');
            return;
        }

        setSavingTemplate(true);
        setTemplateError('');
        try {
            await persistBranding();
            const created = await saveBrandTemplate(name, video.id);
            setBrandTemplates((current) => [created, ...current]);
            setTemplateName('');
        } catch (err) {
            setTemplateError(err instanceof Error ? err.message : 'No se pudo guardar la plantilla de marca.');
        } finally {
            setSavingTemplate(false);
        }
    }

    async function handleApplyTemplate(template: BrandTemplate) {
        setApplyingId(template.id);
        setTemplateError('');
        try {
            const updated = await applyBrandTemplate(video.id, template.id);
            onUpdated(updated);
            // The form holds its own copy of each field, so it has to follow the
            // brand that was just applied instead of showing the previous one.
            setPrimaryColor(updated.branding.primary_color);
            setSecondaryColor(updated.branding.secondary_color);
            setFontFamily(updated.branding.font_family);
            setLogoPosition(updated.branding.logo_position);
        } catch (err) {
            setTemplateError(err instanceof Error ? err.message : 'No se pudo aplicar la plantilla de marca.');
        } finally {
            setApplyingId(null);
        }
    }

    async function handleDeleteTemplate(template: BrandTemplate) {
        const confirmed = window.confirm(`Se eliminara la plantilla de marca "${template.name}". Continuar?`);
        if (!confirmed) return;

        setDeletingTemplateId(template.id);
        setTemplateError('');
        try {
            await deleteBrandTemplate(template.id);
            setBrandTemplates((current) => current.filter((item) => item.id !== template.id));
        } catch (err) {
            setTemplateError(err instanceof Error ? err.message : 'No se pudo eliminar la plantilla de marca.');
        } finally {
            setDeletingTemplateId(null);
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
        <section className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Marca (branding)</h3>

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
                            className="h-9 w-14 cursor-pointer rounded border border-white/15"
                        />
                        <span className="text-sm text-slate-400">{primaryColor}</span>
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
                            className="h-9 w-14 cursor-pointer rounded border border-white/15"
                        />
                        <span className="text-sm text-slate-400">{secondaryColor}</span>
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="font-family">Tipografía</label>
                    {/* A select, not free text: only these four typefaces ship with the
                        renderer, and a name it cannot honour would silently do nothing. */}
                    <select
                        id="font-family"
                        value={FONT_OPTIONS.some((option) => option.value === fontFamily) ? fontFamily : 'sans'}
                        onChange={(event) => setFontFamily(event.target.value)}
                        disabled={saving}
                        className="w-full rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                    >
                        {FONT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="logo-position">Posición del logo</label>
                    <select
                        id="logo-position"
                        value={logoPosition}
                        onChange={(event) => setLogoPosition(event.target.value as LogoPosition)}
                        disabled={saving}
                        className="w-full rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                    >
                        {LOGO_POSITION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {saveError && <p className="mt-3 text-sm text-red-300">{saveError}</p>}
            <div className="mt-3">
                <button
                    type="button"
                    onClick={handleSaveBranding}
                    disabled={saving || !dirty}
                    className="rounded bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Guardar cambios de marca'}
                </button>
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
                <label className="mb-1 block text-sm font-medium" htmlFor="logo-upload">Logo</label>
                {branding.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- external/base64-derived Supabase Storage URL, not a static local asset.
                    <img src={branding.logo_url} alt="Logo actual de la marca" className="mb-2 h-16 w-auto rounded border border-white/10 bg-white/5 object-contain p-1" />
                )}
                <input
                    id="logo-upload"
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_LOGO_TYPES}
                    onChange={handleLogoChange}
                    disabled={uploading}
                    className="block w-full text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                />
                <p className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP o SVG. Máximo 2MB.</p>
                {uploading && <p className="mt-1 text-sm text-slate-400">Subiendo logo...</p>}
                {uploadError && <p className="mt-1 text-sm text-red-300">{uploadError}</p>}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
                <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Plantillas de marca</h4>
                <p className="mb-3 text-sm text-slate-300">
                    Guarda esta identidad (colores, tipografía, logo y su posición) con un nombre y aplícala a
                    cualquier otro video para producir contenido consistente sin repetir la configuración.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={templateName}
                        onChange={(event) => setTemplateName(event.target.value)}
                        placeholder="Ej. Marca principal"
                        maxLength={80}
                        disabled={savingTemplate}
                        aria-label="Nombre de la plantilla de marca"
                        className="min-w-0 flex-1 rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate || !templateName.trim()}
                        className="rounded border border-sky-400/50 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {savingTemplate ? 'Guardando...' : 'Guardar como plantilla'}
                    </button>
                </div>

                {templateError && <p className="mt-2 text-sm text-red-300">{templateError}</p>}

                {brandTemplates.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">Todavía no hay plantillas de marca guardadas.</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {brandTemplates.map((template) => (
                            <li key={template.id} className="flex items-center gap-2 rounded border border-white/10 px-3 py-2">
                                <span className="flex shrink-0 gap-1" aria-hidden="true">
                                    <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: template.branding.primary_color }} />
                                    <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: template.branding.secondary_color }} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm">{template.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleApplyTemplate(template)}
                                    disabled={applyingId === template.id}
                                    className="rounded bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {applyingId === template.id ? 'Aplicando...' : 'Aplicar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTemplate(template)}
                                    disabled={deletingTemplateId === template.id}
                                    aria-label={`Eliminar la plantilla ${template.name}`}
                                    title="Eliminar plantilla"
                                    className="rounded p-1.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
