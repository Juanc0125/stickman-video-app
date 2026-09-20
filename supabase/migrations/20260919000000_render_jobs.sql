-- Generating a video with an AI model takes minutes per scene, so rendering
-- can no longer be a synchronous request. The worker now reports progress by
-- writing back to the video row, which means job state survives a worker
-- restart and the UI can poll the endpoint it already uses to list videos.

alter table public.videos
    add column if not exists render_status text not null default 'inactivo',
    add column if not exists render_progress integer not null default 0,
    add column if not exists render_error text,
    add column if not exists render_started_at timestamptz;

alter table public.videos
    drop constraint if exists videos_render_status_check;

alter table public.videos
    add constraint videos_render_status_check
    check (render_status in ('inactivo', 'procesando', 'listo', 'error'));

alter table public.videos
    drop constraint if exists videos_render_progress_check;

alter table public.videos
    add constraint videos_render_progress_check
    check (render_progress between 0 and 100);
