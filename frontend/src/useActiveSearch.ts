import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "./api";
import { useNotify } from "./useSnackbar";
import type { JobSearch } from "./types";

/**
 * Loads the caller's active job search round. Pass `searchId` to instead load
 * a specific (typically closed/historical) round, e.g. for `/jobs/history/:searchId`.
 */
export function useActiveSearch(searchId?: number): {
	activeSearch: JobSearch | null;
	loading: boolean;
	reload: () => void;
} {
	const [activeSearch, setActiveSearch] = useState<JobSearch | null>(null);
	const [loading, setLoading] = useState(true);
	const notify = useNotify();

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setActiveSearch(
				searchId !== undefined
					? await api.getSearch(searchId)
					: await api.getActiveSearch(),
			);
		} catch (error) {
			if (!(error instanceof ApiError && error.status === 404)) {
				notify("Failed to load search round", "error");
			}
			setActiveSearch(null);
		} finally {
			setLoading(false);
		}
	}, [notify, searchId]);

	useEffect(() => {
		void load();
	}, [load]);

	return { activeSearch, loading, reload: load };
}
