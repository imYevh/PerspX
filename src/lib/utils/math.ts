/**
 * Generates a unique identifier string.
 * Uses crypto.randomUUID when available, falls back to a timestamp + random hex string.
 */
export function generateId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}

	// Fallback: timestamp + random hex
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 10);
	return `${timestamp}-${random}`;
}
