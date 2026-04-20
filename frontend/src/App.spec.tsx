import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { api, setUnauthorizedHandler } from "./api";
import { computeDateUpdates } from "./jobUtils";
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

describe(computeDateUpdates, () => {
	const NOW = "2026-03-25T14:30";
	const jobWithDates = {
		date_last_onsite: "2026-03-23T09:00",
		date_phone_screen: "2026-03-20T10:00",
	};
	const jobNoDates = { date_last_onsite: null, date_phone_screen: null };

	it("preserves both dates when moving to Phone screen", () => {
		const result = computeDateUpdates(jobWithDates, "Phone screen", NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
		expect(result.date_last_onsite).toBe(jobWithDates.date_last_onsite);
	});

	it("preserves null dates when moving to Phone screen with no prior dates", () => {
		const result = computeDateUpdates(jobNoDates, "Phone screen", NOW);
		expect(result.date_phone_screen).toBeNull();
		expect(result.date_last_onsite).toBeNull();
	});

	it("preserves both dates when moving to Interviewing", () => {
		const result = computeDateUpdates(jobWithDates, "Interviewing", NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
		expect(result.date_last_onsite).toBe(jobWithDates.date_last_onsite);
	});

	it("preserves null dates when moving to Interviewing with no prior dates", () => {
		const result = computeDateUpdates(jobNoDates, "Interviewing", NOW);
		expect(result.date_phone_screen).toBeNull();
		expect(result.date_last_onsite).toBeNull();
	});

	it("preserves both dates when moving back to Not started", () => {
		const result = computeDateUpdates(jobWithDates, "Not started", NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
		expect(result.date_last_onsite).toBe(jobWithDates.date_last_onsite);
	});

	it("preserves both dates when moving back to Applied", () => {
		const result = computeDateUpdates(jobWithDates, "Applied", NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
		expect(result.date_last_onsite).toBe(jobWithDates.date_last_onsite);
	});

	it("preserves both dates when moving to Offer!", () => {
		const result = computeDateUpdates(jobWithDates, "Offer!", NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
		expect(result.date_last_onsite).toBe(jobWithDates.date_last_onsite);
	});

	it("preserves both dates when moving to Rejected/Withdrawn", () => {
		const result = computeDateUpdates(jobWithDates, "Rejected/Withdrawn", NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
		expect(result.date_last_onsite).toBe(jobWithDates.date_last_onsite);
	});
});
