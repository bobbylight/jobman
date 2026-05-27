import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppShell from "./AppShell";
import type { User } from "../types";

const mockNavigate = vi.fn();

vi.mock(import("react-router-dom"), async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("react-router-dom")>();
	return {
		...actual,
		Outlet: () => <div data-testid="outlet" />,
		useNavigate: () => mockNavigate,
	};
});

const MOCK_USER: User = {
	avatarUrl: null,
	displayName: "Test User",
	email: "test@example.com",
	id: 1,
};

const DEFAULT_PROPS = {
	currentUser: MOCK_USER,
	onLogout: vi.fn(),
};

function renderAppShell(props = DEFAULT_PROPS, initialPath = "/jobs") {
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<AppShell {...props} />
		</MemoryRouter>,
	);
}

describe(AppShell, () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders the logo", () => {
		renderAppShell();
		expect(screen.getByRole("img", { name: "JobMan" })).toBeInTheDocument();
	});

	it("renders the Board nav button", () => {
		renderAppShell();
		expect(screen.getByRole("button", { name: "Board" })).toBeInTheDocument();
	});

	it("renders the Calendar nav button", () => {
		renderAppShell();
		expect(
			screen.getByRole("button", { name: "Calendar" }),
		).toBeInTheDocument();
	});

	it("renders the Stats nav button", () => {
		renderAppShell();
		expect(screen.getByRole("button", { name: "Stats" })).toBeInTheDocument();
	});

	it("renders the outlet", () => {
		renderAppShell();
		expect(screen.getByTestId("outlet")).toBeInTheDocument();
	});

	it("navigates to /jobs when Board is clicked", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "Board" }));
		expect(mockNavigate).toHaveBeenCalledWith("/jobs");
	});

	it("navigates to /calendar when Calendar is clicked", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
		expect(mockNavigate).toHaveBeenCalledWith("/calendar");
	});

	it("navigates to /stats when Stats is clicked", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "Stats" }));
		expect(mockNavigate).toHaveBeenCalledWith("/stats");
	});

	it("renders the user menu button", () => {
		renderAppShell();
		expect(
			screen.getByRole("button", { name: "User menu" }),
		).toBeInTheDocument();
	});

	it("renders avatar with src when avatarUrl is provided", () => {
		renderAppShell({
			...DEFAULT_PROPS,
			currentUser: {
				...MOCK_USER,
				avatarUrl: "https://example.com/avatar.png",
			},
		});
		expect(screen.getByRole("img", { name: "Test User" })).toBeInTheDocument();
	});

	it("opens user menu on avatar button click", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "User menu" }));
		expect(
			screen.getByRole("menuitem", { name: /Sign Out/ }),
		).toBeInTheDocument();
	});

	it("calls onLogout when Sign Out is clicked", () => {
		const onLogout = vi.fn();
		renderAppShell({ ...DEFAULT_PROPS, onLogout });
		fireEvent.click(screen.getByRole("button", { name: "User menu" }));
		fireEvent.click(screen.getByRole("menuitem", { name: /Sign Out/ }));
		expect(onLogout).toHaveBeenCalledOnce();
	});

	it("closes user menu when Sign Out is clicked", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "User menu" }));
		fireEvent.click(screen.getByRole("menuitem", { name: /Sign Out/ }));
		expect(
			screen.queryByRole("menuitem", { name: /Sign Out/ }),
		).not.toBeInTheDocument();
	});
});
