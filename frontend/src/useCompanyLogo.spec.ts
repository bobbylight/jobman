import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCompanyLogo } from "./useCompanyLogo";
import * as logoCache from "./logoCache";

vi.mock("./logoCache", () => ({
	getCachedLogo: vi.fn(),
	fetchLogo: vi.fn(),
}));

describe("useCompanyLogo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null immediately when there is no cached entry", () => {
		vi.mocked(logoCache.getCachedLogo).mockReturnValue(undefined);
		vi.mocked(logoCache.fetchLogo).mockResolvedValue({ status: "not-found" });

		const { result } = renderHook(() => useCompanyLogo("Acme"));
		expect(result.current).toBeNull();
	});

	it("returns the cached src immediately without fetching when the cache is warm", () => {
		vi.mocked(logoCache.getCachedLogo).mockReturnValue({
			status: "resolved",
			src: "blob:cached-url",
		});

		const { result } = renderHook(() => useCompanyLogo("Acme"));

		expect(result.current).toBe("blob:cached-url");
		expect(logoCache.fetchLogo).not.toHaveBeenCalled();
	});

	it("calls fetchLogo when there is no cached entry", () => {
		vi.mocked(logoCache.getCachedLogo).mockReturnValue(undefined);
		vi.mocked(logoCache.fetchLogo).mockResolvedValue({ status: "not-found" });

		renderHook(() => useCompanyLogo("Acme"));

		expect(logoCache.fetchLogo).toHaveBeenCalledWith("Acme");
	});

	it("updates to the blob src after fetchLogo resolves with a logo", async () => {
		vi.mocked(logoCache.getCachedLogo).mockReturnValue(undefined);
		vi.mocked(logoCache.fetchLogo).mockResolvedValue({
			status: "resolved",
			src: "blob:fetched-url",
		});

		const { result } = renderHook(() => useCompanyLogo("Acme"));

		await waitFor(() => expect(result.current).toBe("blob:fetched-url"));
	});

	it("stays null after fetchLogo resolves with not-found", async () => {
		vi.mocked(logoCache.getCachedLogo).mockReturnValue(undefined);
		vi.mocked(logoCache.fetchLogo).mockResolvedValue({ status: "not-found" });

		const { result } = renderHook(() => useCompanyLogo("Acme"));

		await waitFor(() => expect(logoCache.fetchLogo).toHaveBeenCalled());
		expect(result.current).toBeNull();
	});

	it("does not update state after unmount (cancellation)", async () => {
		vi.mocked(logoCache.getCachedLogo).mockReturnValue(undefined);

		let resolveEntry!: (
			entry: Awaited<ReturnType<typeof logoCache.fetchLogo>>,
		) => void;
		vi.mocked(logoCache.fetchLogo).mockReturnValue(
			new Promise((resolve) => {
				resolveEntry = resolve;
			}),
		);

		const { result, unmount } = renderHook(() => useCompanyLogo("Acme"));
		unmount();
		resolveEntry({ status: "resolved", src: "blob:late-url" });

		// Give any pending microtasks a chance to run
		await Promise.resolve();
		expect(result.current).toBeNull();
	});

	it("re-fetches when the company name changes", () => {
		vi.mocked(logoCache.getCachedLogo).mockReturnValue(undefined);
		vi.mocked(logoCache.fetchLogo).mockResolvedValue({ status: "not-found" });

		const { rerender } = renderHook(({ company }) => useCompanyLogo(company), {
			initialProps: { company: "Acme" },
		});

		rerender({ company: "Globex" });

		expect(logoCache.fetchLogo).toHaveBeenCalledWith("Acme");
		expect(logoCache.fetchLogo).toHaveBeenCalledWith("Globex");
	});
});
