import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PastSearchesDialog from "./PastSearchesDialog";
import { api } from "../../api";
import { SnackbarProvider } from "../../useSnackbar";
import { makeJobSearch } from "../../testUtils";

vi.mock(
	import("../../api"),
	() =>
		({
			api: {
				listSearches: vi.fn(),
			},
		}) as any,
);

const mockListSearches = vi.mocked(api.listSearches);

const DEFAULT_PROPS = {
	onClose: vi.fn(),
	onSelect: vi.fn(),
	open: true,
};

function renderDialog(props = DEFAULT_PROPS) {
	return render(
		<SnackbarProvider>
			<PastSearchesDialog {...props} />
		</SnackbarProvider>,
	);
}

describe("pastSearchesDialog", () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders nothing meaningful when open=false", () => {
		renderDialog({ ...DEFAULT_PROPS, open: false });
		expect(
			screen.queryByRole("heading", { name: "Past Job Searches" }),
		).not.toBeInTheDocument();
		expect(mockListSearches).not.toHaveBeenCalled();
	});

	it("shows a loading spinner while fetching", () => {
		mockListSearches.mockReturnValue(new Promise(() => {}));
		renderDialog();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("shows an empty state when there are no closed rounds", async () => {
		mockListSearches.mockResolvedValue([
			makeJobSearch({ closed_at: null, id: 1, name: "Current Search" }),
		]);
		renderDialog();
		await waitFor(() => {
			expect(screen.getByText(/No past job searches yet/i)).toBeInTheDocument();
		});
	});

	it("excludes the active round and lists closed rounds", async () => {
		mockListSearches.mockResolvedValue([
			makeJobSearch({ closed_at: null, id: 1, name: "Current Search" }),
			makeJobSearch({
				closed_at: "2026-01-01T12:00:00",
				id: 2,
				name: "Old Search",
				started_at: "2025-06-01T12:00:00",
			}),
		]);
		renderDialog();
		await waitFor(() => {
			expect(screen.getByText("Old Search")).toBeInTheDocument();
		});
		expect(screen.queryByText("Current Search")).not.toBeInTheDocument();
		expect(screen.getByText(/Started Jun 1, 2025/)).toBeInTheDocument();
	});

	it("calls onSelect with the search when a row is clicked", async () => {
		const search = makeJobSearch({
			closed_at: "2026-01-01T12:00:00",
			id: 2,
			name: "Old Search",
		});
		mockListSearches.mockResolvedValue([search]);
		renderDialog();
		await waitFor(() => {
			expect(screen.getByText("Old Search")).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText("Old Search"));
		expect(DEFAULT_PROPS.onSelect).toHaveBeenCalledWith(search);
	});

	it("calls onClose when the Close button is clicked", async () => {
		mockListSearches.mockResolvedValue([]);
		renderDialog();
		await waitFor(() => {
			expect(screen.getByText(/No past job searches yet/i)).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(DEFAULT_PROPS.onClose).toHaveBeenCalledOnce();
	});

	it("shows an error notification and an empty list when the fetch fails", async () => {
		mockListSearches.mockRejectedValue(new Error("network error"));
		renderDialog();
		await waitFor(() => {
			expect(
				screen.getByText("Failed to load past job searches"),
			).toBeInTheDocument();
		});
		expect(screen.getByText(/No past job searches yet/i)).toBeInTheDocument();
	});
});
