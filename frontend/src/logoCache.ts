type CacheEntry = { status: "resolved"; src: string } | { status: "not-found" };

const cache = new Map<string, CacheEntry>();

function normalize(company: string): string {
	return company.trim().toLowerCase();
}

export function getCachedLogo(company: string): CacheEntry | undefined {
	return cache.get(normalize(company));
}

export async function fetchLogo(company: string): Promise<CacheEntry> {
	const key = normalize(company);
	const existing = cache.get(key);
	if (existing) {
		return existing;
	}

	const url = `https://img.logo.dev/name/${encodeURIComponent(company)}?token=pk_BE48kXYQS7GkDayksxF6YA&size=32&format=png`;
	try {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error("not found");
		}
		const blob = await res.blob();
		const entry: CacheEntry = {
			src: URL.createObjectURL(blob),
			status: "resolved",
		};
		cache.set(key, entry);
		return entry;
	} catch {
		const entry: CacheEntry = { status: "not-found" };
		cache.set(key, entry);
		return entry;
	}
}
