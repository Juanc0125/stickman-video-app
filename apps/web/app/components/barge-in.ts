// Barge-in for hands-free mode: lets the operator cut the assistant off by
// simply talking over it, the way you would with a person. Speech recognition
// cannot do this itself - it would transcribe the assistant's own voice coming
// out of the speakers - so this listens to the input level only.
//
// The first moments of the reply calibrate the floor, and they include the
// assistant's own voice leaking back into the mic; only something clearly
// louder than that, held for a while, counts as the operator talking. A cough
// or a door is too short; the echo is too quiet.

const POLL_MS = 50;
const CALIBRATE_MS = 600;
// Absolute floor so a silent room with headphones does not trigger on breath.
const MIN_LEVEL = 0.035;
const OVER_FLOOR = 2.6;
const SUSTAIN_MS = 350;

/** Watches the mic and calls onVoice once when the operator talks; returns the stop function. */
export function watchForBargeIn(onVoice: () => void): () => void {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
        return () => undefined;
    }

    let stopped = false;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
        stopped = true;
        if (poll) clearInterval(poll);
        poll = null;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        void audioContext?.close().catch(() => undefined);
        audioContext = null;
    };

    void (async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        } catch {
            // No permission or no mic: barge-in by voice is simply unavailable;
            // pressing the mic button still interrupts.
            return;
        }
        if (stopped) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
            return;
        }

        audioContext = new AudioContext();
        void audioContext.resume().catch(() => undefined);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const startedAt = Date.now();
        let floor = 0.005;
        let voicedSince = 0;

        poll = setInterval(() => {
            analyser.getFloatTimeDomainData(samples);
            let sum = 0;
            for (const sample of samples) sum += sample * sample;
            const level = Math.sqrt(sum / samples.length);
            const now = Date.now();

            if (now - startedAt < CALIBRATE_MS) {
                floor = Math.max(floor, level);
                return;
            }
            if (level > Math.max(MIN_LEVEL, floor * OVER_FLOOR)) {
                if (!voicedSince) voicedSince = now;
                if (now - voicedSince >= SUSTAIN_MS) {
                    stop();
                    onVoice();
                }
            } else {
                voicedSince = 0;
            }
        }, POLL_MS);
    })();

    return stop;
}
