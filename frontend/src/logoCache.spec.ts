import type {
	fetchLogo as FetchLogo,
	getCachedLogo as GetCachedLogo,
} from "./logoCache";

function mockFetchOk() {
	vi.mocked(fetch).mockResolvedValue({
		blob: () => Promise.resolve(new Blob(["img"], { type: "image/png" })),
		ok: true,
	} as Response);
}

function mockFetchNotFound() {
	vi.mocked(fetch).mockResolvedValue({
		ok: false,
	} as Response);
}

// The cache is a module-level Map, so we reset modules before each test to get
// A fresh cache, then dynamically import the module.
describe("logoCache", () => {
	let getCachedLogo: typeof GetCachedLogo;
	let fetchLogo: typeof FetchLogo;

	beforeEach(async () => {
		vi.resetModules();
		vi.stubGlobal("fetch", vi.fn());
		URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
		const mod = await import("./logoCache");
		({ getCachedLogo } = mod);
		({ fetchLogo } = mod);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("getCachedLogo", () => {
		it("returns undefined when the cache is empty", () => {
			expect(getCachedLogo("Acme")).toBeUndefined();
		});

		it("returns undefined for an unknown company after other companies were cached", async () => {
			mockFetchOk();
			await fetchLogo("Acme");
			expect(getCachedLogo("Unknown Co")).toBeUndefined();
		});

		it("returns the cached entry after a successful fetch", async () => {
			mockFetchOk();
			await fetchLogo("Acme");
			expect(getCachedLogo("Acme")).toEqual({
				src: "blob:mock-url",
				status: "resolved",
			});
		});

		it("returns the cached entry after a failed fetch", async () => {
			mockFetchNotFound();
			await fetchLogo("Acme");
			expect(getCachedLogo("Acme")).toEqual({ status: "not-found" });
		});
	});

	describe("fetchLogo", () => {
		it("calls fetch with the correct logo.dev URL", async () => {
			mockFetchOk();
			await fetchLogo("Acme Corp");
			expect(fetch).toHaveBeenCalledWith(
				"https://img.logo.dev/name/Acme%20Corp?token=pk_BE48kXYQS7GkDayksxF6YA&size=32&format=png",
			);
		});

		it("URL-encodes special characters in the company name", async () => {
			mockFetchOk();
			await fetchLogo("AT&T");
			expect(fetch).toHaveBeenCalledWith(expect.stringContaining("AT%26T"));
		});

		it("returns a resolved entry and calls createObjectURL on success", async () => {
			mockFetchOk();
			const entry = await fetchLogo("Acme");
			expect(URL.createObjectURL).toHaveBeenCalledOnce();
			expect(entry).toEqual({ src: "blob:mock-url", status: "resolved" });
		});

		it("returns a not-found entry when the response is not ok", async () => {
			mockFetchNotFound();
			const entry = await fetchLogo("Acme");
			expect(URL.createObjectURL).not.toHaveBeenCalled();
			expect(entry).toEqual({ status: "not-found" });
		});

		it("returns a not-found entry when fetch throws", async () => {
			vi.mocked(fetch).mockRejectedValue(new Error("network error"));
			const entry = await fetchLogo("Acme");
			expect(entry).toEqual({ status: "not-found" });
		});

		it("only fetches once for the same company on repeated calls", async () => {
			mockFetchOk();
			await fetchLogo("Acme");
			await fetchLogo("Acme");
			expect(fetch).toHaveBeenCalledOnce();
		});

		it("returns the cached entry directly on the second call without fetching", async () => {
			mockFetchOk();
			const first = await fetchLogo("Acme");
			const second = await fetchLogo("Acme");
			expect(second).toBe(first);
		});

		it("treats the same company name with different casing as one entry", async () => {
			mockFetchOk();
			await fetchLogo("acme");
			await fetchLogo("ACME");
			expect(fetch).toHaveBeenCalledOnce();
		});

		it("treats the same company name with surrounding whitespace as one entry", async () => {
			mockFetchOk();
			await fetchLogo("  Acme  ");
			await fetchLogo("Acme");
			expect(fetch).toHaveBeenCalledOnce();
		});

		it("caches distinct companies separately", async () => {
			mockFetchOk();
			await fetchLogo("Acme");
			await fetchLogo("Globex");
			expect(fetch).toHaveBeenCalledTimes(2);
		});

		it("caches a not-found result so the API is not retried", async () => {
			mockFetchNotFound();
			await fetchLogo("Acme");
			await fetchLogo("Acme");
			expect(fetch).toHaveBeenCalledOnce();
		});
	});
});
