// Dictation for browsers without the Web Speech API (Firefox, Brave, some
// Safari setups). It records one phrase with MediaRecorder, decides by itself
// when the speaker has stopped, and has /api/transcribe turn it into text.
//
// It deliberately exposes the same tiny shape as the native recognition the
// assistant already drives (start/stop + onresult/onerror/onend), so the
// assistant's listening flow - pause to send, second press to send, hands-free
// resume, error messages - works unchanged on top of either one.

type Alternative = { transcript: string };
type Result = ArrayLike<Alternative> & { isFinal: boolean };
type ResultEvent = { resultIndex: number; results: ArrayLike<Result> };

export interface RecordedRecognition {
    lang: string; continuous: boolean; interimResults: boolean;
    start: () => void; stop: () => void;
    onresult: ((event: ResultEvent) => void) | null;
    onerror: ((event: { error?: string }) => void) | null;
    onend: (() => void) | null;
}

// Silence after speech that ends the phrase. Shorter than the native path's
// PAUSE_TO_SEND_MS because the transcription round trip comes on top of it.
const END_OF_PHRASE_MS = 1400;
// Nobody spoke: give the mic back so hands-free can reopen it.
const NO_SPEECH_MS = 8000;
// One phrase, not a monologue; also keeps the upload under Vercel's limit.
const MAX_PHRASE_MS = 30000;
const POLL_MS = 100;

function pickMimeType(): string | undefined {
    const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function result(transcript: string, isFinal: boolean): ResultEvent {
    const slot = Object.assign([{ transcript }], { isFinal });
    return { resultIndex: 0, results: [slot] };
}

/** Null when the browser cannot record audio at all; then only typing is left. */
export function createRecordedRecognition(): RecordedRecognition | null {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return null;
    }

    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let audioContext: AudioContext | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let stopping = false;
    let heardVoice = false;
    const chunks: Blob[] = [];

    const recognition: RecordedRecognition = {
        lang: 'es-MX',
        continuous: true,
        interimResults: true,
        onresult: null,
        onerror: null,
        onend: null,
        start: () => { void begin(); },
        stop: () => finishRecording(),
    };

    function release() {
        if (poll) clearInterval(poll);
        poll = null;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        void audioContext?.close().catch(() => undefined);
        audioContext = null;
    }

    function fail(error: string) {
        release();
        recognition.onerror?.({ error });
        recognition.onend?.();
    }

    function finishRecording() {
        if (stopping) return;
        stopping = true;
        if (recorder && recorder.state !== 'inactive') recorder.stop();
        else {
            release();
            recognition.onend?.();
        }
    }

    async function transcribe(blob: Blob) {
        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': blob.type || 'audio/webm' },
                body: blob,
            });
            const data = await response.json().catch(() => ({})) as { text?: unknown };
            if (!response.ok) {
                recognition.onerror?.({ error: 'network' });
            } else if (typeof data.text === 'string' && data.text.trim()) {
                recognition.onresult?.(result(data.text.trim(), true));
            }
        } catch {
            recognition.onerror?.({ error: 'network' });
        }
        recognition.onend?.();
    }

    async function begin() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        } catch (error) {
            const name = error instanceof DOMException ? error.name : '';
            fail(name === 'NotAllowedError' || name === 'SecurityError' ? 'not-allowed' : 'audio-capture');
            return;
        }
        if (stopping) { release(); recognition.onend?.(); return; }

        const mimeType = pickMimeType();
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
        recorder.onstop = () => {
            release();
            // Silence only: nothing to send, end quietly so hands-free reopens.
            if (!heardVoice || chunks.length === 0) { recognition.onend?.(); return; }
            void transcribe(new Blob(chunks, { type: (recorder?.mimeType || mimeType || 'audio/webm').split(';')[0] }));
        };
        recorder.start(250);

        // Voice activity from the input level. The floor adapts to the room
        // over the first few hundred ms, so a noisy office does not count as
        // someone talking and a quiet one does not need shouting.
        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const startedAt = Date.now();
        let floor = 0.01;
        let lastVoiceAt = 0;
        let lastPulseAt = 0;

        poll = setInterval(() => {
            analyser.getFloatTimeDomainData(samples);
            let sum = 0;
            for (const sample of samples) sum += sample * sample;
            const level = Math.sqrt(sum / samples.length);
            const now = Date.now();

            if (now - startedAt < 400) floor = Math.max(floor, level);
            const speaking = level > Math.max(0.015, floor * 2.5);
            if (speaking) {
                heardVoice = true;
                lastVoiceAt = now;
                // Something on screen while recording, and a pulse for the
                // assistant's figure - the text itself only exists afterwards.
                if (now - lastPulseAt > 400) {
                    lastPulseAt = now;
                    recognition.onresult?.(result('…', false));
                }
            }

            const quietTooLong = heardVoice && now - lastVoiceAt > END_OF_PHRASE_MS;
            const nobodySpoke = !heardVoice && now - startedAt > NO_SPEECH_MS;
            if (quietTooLong || nobodySpoke || now - startedAt > MAX_PHRASE_MS) finishRecording();
        }, POLL_MS);
    }

    return recognition;
}
