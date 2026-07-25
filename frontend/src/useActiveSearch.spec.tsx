import React from "react";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { useActiveSearch } from "./useActiveSearch";
import { ApiError, api } from "./api";
import { SnackbarProvider } from "./useSnackbar";
import { makeJobSearch } from "./testUtils";

vi.mock(import("./api"), () => {
	class MockApiError extends Error {
		status: number;
		body: unknown;

		constructor(status: number, body: unknown) {
			super(`API error ${status}`);
			this.name = "MockApiError";
			this.status = status;
			this.body = body;
		}
	}
	return {
		ApiError: MockApiError,
		api: {
			getActiveSearch: vi.fn(),
			getSearch: vi.fn(),
		},
	} as any;
});

const MOCK_SEARCH = makeJobSearch();

function wrapper({ children }: { children: React.ReactNode }) {
	return <SnackbarProvider>{children}</SnackbarProvider>;
}

describe("useActiveSearch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches the active search when no searchId is given", async () => {
		vi.mocked(api.getActiveSearch).mockResolvedValue(MOCK_SEARCH);

		const { result } = renderHook(() => useActiveSearch(), { wrapper });

		expect(result.current.loading).toBeTruthy();
		await waitFor(() => expect(result.current.loading).toBeFalsy());

		expect(result.current.activeSearch).toStrictEqual(MOCK_SEARCH);
		expect(api.getActiveSearch).toHaveBeenCalledWith();
		expect(api.getSearch).not.toHaveBeenCalled();
	});

	it("fetches the specific round via getSearch when searchId is given", async () => {
		const closed = makeJobSearch({ id: 2, closed_at: "2026-02-01T00:00:00Z" });
		vi.mocked(api.getSearch).mockResolvedValue(closed);

		const { result } = renderHook(() => useActiveSearch(2), { wrapper });

		await waitFor(() => expect(result.current.loading).toBeFalsy());

		expect(result.current.activeSearch).toStrictEqual(closed);
		expect(api.getSearch).toHaveBeenCalledWith(2);
		expect(api.getActiveSearch).not.toHaveBeenCalled();
	});

	it("re-fetches when searchId changes", async () => {
		vi.mocked(api.getActiveSearch).mockResolvedValue(MOCK_SEARCH);
		vi.mocked(api.getSearch).mockResolvedValue(
			makeJobSearch({ id: 2, closed_at: "2026-02-01T00:00:00Z" }),
		);

		const { result, rerender } = renderHook(
			(props: { searchId: number | undefined }) =>
				useActiveSearch(props.searchId),
			{
				wrapper,
				initialProps: { searchId: undefined as number | undefined },
			},
		);

		await waitFor(() => expect(result.current.loading).toBeFalsy());
		expect(api.getActiveSearch).toHaveBeenCalledOnce();

		rerender({ searchId: 2 });

		await waitFor(() => expect(api.getSearch).toHaveBeenCalledWith(2));
	});

	it("stays null and does not notify on a 404 (no active round yet)", async () => {
		vi.mocked(api.getActiveSearch).mockRejectedValue(
			new ApiError(404, "Not found"),
		);

		const { result } = renderHook(() => useActiveSearch(), { wrapper });

		await waitFor(() => expect(result.current.loading).toBeFalsy());
		expect(result.current.activeSearch).toBeNull();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("notifies on a non-404 failure", async () => {
		vi.mocked(api.getActiveSearch).mockRejectedValue(new Error("boom"));

		function Probe() {
			useActiveSearch();
			return null;
		}
		render(<Probe />, { wrapper });

		await waitFor(() =>
			expect(
				screen.getByText("Failed to load search round"),
			).toBeInTheDocument(),
		);
	});

	it("reload() re-fetches on demand", async () => {
		vi.mocked(api.getActiveSearch).mockResolvedValue(MOCK_SEARCH);

		const { result } = renderHook(() => useActiveSearch(), { wrapper });
		await waitFor(() => expect(result.current.loading).toBeFalsy());

		expect(api.getActiveSearch).toHaveBeenCalledOnce();
		result.current.reload();

		await waitFor(() => expect(api.getActiveSearch).toHaveBeenCalledTimes(2));
	});
});
