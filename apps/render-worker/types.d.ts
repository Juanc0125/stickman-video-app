// unbzip2-stream ships no types and has none on DefinitelyTyped. It is a
// plain stream transform, which is all this worker uses it for.
declare module 'unbzip2-stream' {
	import type { Transform } from 'node:stream';
	export default function unbzip2Stream(): Transform;
}
