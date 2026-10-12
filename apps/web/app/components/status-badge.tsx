import type { VideoStatus } from '@shared-types/video';
import { STATUS_BADGE_CLASSES, STATUS_DOT_CLASSES, STATUS_LABELS } from './constants';

export default function StatusBadge({ status }: { status: VideoStatus }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE_CLASSES[status]}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASSES[status]}`} aria-hidden="true" />
            {STATUS_LABELS[status]}
        </span>
    );
}
