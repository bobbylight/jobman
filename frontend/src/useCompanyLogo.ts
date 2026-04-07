import { useEffect, useState } from "react";
import { getCachedLogo, fetchLogo } from "./logoCache";

export function useCompanyLogo(company: string): string | null {
	const cached = getCachedLogo(company);
	const [src, setSrc] = useState<string | null>(
		cached?.status === "resolved" ? cached.src : null,
	);

	useEffect(() => {
		if (cached) return;
		let cancelled = false;
		fetchLogo(company).then((entry) => {
			if (!cancelled && entry.status === "resolved") setSrc(entry.src);
		});
		return () => {
			cancelled = true;
		};
	}, [company, cached]);

	return src;
}
