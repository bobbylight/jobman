import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { api, setUnauthorizedHandler } from "./api";
import type { User } from "./types";

let capturedUnauthorizedHandler: (() => void) | null = null;
let capturedOnLogout: (() => Promise<void>) | null = null;

vi.mock(
	import("./api"),
	() =>
		({
			api: {
				getMe: vi.fn(),
				logout: vi.fn(),
			},
			setUnauthorizedHandler: vi.fn((handler: () => void) => {
				capturedUnauthorizedHandler = handler;
			}),
		}) as any,
);

vi.mock(
	import("./components/AppShell"),
	() =>
		({
			default: ({
				currentUser,
				onLogout,
			}: {
				currentUser: User;
				onLogout: () => Promise<void>;
			}) => {
				capturedOnLogout = onLogout;
				return <div data-testid="job-management-page">{currentUser.email}</div>;
			},
		}) as any,
);

const mockGetMe = vi.mocked(api.getMe);
const mockLogout = vi.mocked(api.logout);

const MOCK_USER: User = {
	avatarUrl: "https://example.com/avatar.jpg",
	displayName: "Test User",
	email: "test@example.com",
	id: 1,
};

describe(App, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedUnauthorizedHandler = null;
		capturedOnLogout = null;
		mockGetMe.mockResolvedValue(MOCK_USER);
		mockLogout.mockResolvedValue({ success: true });
	});

	describe("authentication", () => {
		it("shows a loading spinner while the auth check is pending", () => {
			mockGetMe.mockReturnValue(new Promise(() => {}));
			render(<App />);
			expect(screen.getByRole("progressbar")).toBeInTheDocument();
		});

		it("shows the login page when the user is not authenticated", async () => {
			mockGetMe.mockResolvedValue(null);
			render(<App />);
			await waitFor(() => {
				expect(
					screen.getByRole("link", { name: "Continue with Google" }),
				).toBeInTheDocument();
			});
		});

		it("renders JobManagementPage when the user is authenticated", async () => {
			render(<App />);
			await waitFor(() => {
				expect(screen.getByTestId("job-management-page")).toBeInTheDocument();
			});
			expect(screen.getByText(MOCK_USER.email)).toBeInTheDocument();
		});

		it("registers an unauthorized handler on mount", async () => {
			render(<App />);
			await waitFor(() => {
				expect(screen.getByTestId("job-management-page")).toBeInTheDocument();
			});
			expect(vi.mocked(setUnauthorizedHandler)).toHaveBeenCalledOnce();
		});

		it("shows the login page when a mid-session API call returns 401", async () => {
			render(<App />);
			await waitFor(() => {
				expect(screen.getByTestId("job-management-page")).toBeInTheDocument();
			});

			act(() => capturedUnauthorizedHandler!());

			expect(
				screen.getByRole("link", { name: "Continue with Google" }),
			).toBeInTheDocument();
		});

		it("shows the login page when onLogout is called from JobManagementPage", async () => {
			render(<App />);
			await waitFor(() => {
				expect(screen.getByTestId("job-management-page")).toBeInTheDocument();
			});

			await act(async () => {
				await capturedOnLogout!();
			});

			expect(mockLogout).toHaveBeenCalledOnce();
			expect(
				screen.getByRole("link", { name: "Continue with Google" }),
			).toBeInTheDocument();
		});
	});
});
