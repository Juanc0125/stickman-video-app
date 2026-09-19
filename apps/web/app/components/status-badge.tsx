import type { VideoStatus } from '@shared-types/video';
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from './constants';

export default function StatusBadge({ status }: { status: VideoStatus }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
        >
            {STATUS_LABELS[status]}
        </span>
    );
}
