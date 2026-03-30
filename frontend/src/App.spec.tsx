import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import App from "./App";
import { api, setUnauthorizedHandler } from "./api";
import { computeDateUpdates } from "./jobUtils";
import type { User } from "./types";

let capturedUnauthorizedHandler: (() => void) | null = null;
let capturedOnLogout: (() => Promise<void>) | null = null;

vi.mock("./api", () => ({
	setUnauthorizedHandler: vi.fn((handler: () => void) => {
		capturedUnauthorizedHandler = handler;
	}),
	api: {
		getMe: vi.fn(),
		logout: vi.fn(),
	},
}));

vi.mock("./components/JobManagementPage", () => ({
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
}));

const mockGetMe = vi.mocked(api.getMe);
const mockLogout = vi.mocked(api.logout);

const MOCK_USER: User = {
	id: 1,
	email: "test@example.com",
	displayName: "Test User",
	avatarUrl: "https://example.com/avatar.jpg",
};

describe("App", () => {
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

describe("computeDateUpdates", () => {
	const NOW = "2026-03-25T14:30";
	const jobWithDates = {
		date_phone_screen: "2026-03-20T10:00",
		date_last_onsite: "2026-03-23T09:00",
	};
	const jobNoDates = { date_phone_screen: null, date_last_onsite: null };

	it("sets date_phone_screen to now and clears date_last_onsite when moving to Phone screen", () => {
		const result = computeDateUpdates(jobWithDates, "Phone screen", NOW);
		expect(result.date_phone_screen).toBe(NOW);
		expect(result.date_last_onsite).toBeNull();
	});

	it("sets date_phone_screen to now when moving to Phone screen from a job with no prior dates", () => {
		const result = computeDateUpdates(jobNoDates, "Phone screen", NOW);
		expect(result.date_phone_screen).toBe(NOW);
		expect(result.date_last_onsite).toBeNull();
	});

	it("sets date_last_onsite to now and preserves date_phone_screen when moving to Interviewing", () => {
		const result = computeDateUpdates(jobWithDates, "Interviewing", NOW);
		expect(result.date_last_onsite).toBe(NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
	});

	it("sets date_last_onsite to now when moving to Interviewing with no prior phone screen", () => {
		const result = computeDateUpdates(jobNoDates, "Interviewing", NOW);
		expect(result.date_last_onsite).toBe(NOW);
		expect(result.date_phone_screen).toBeNull();
	});

	it("clears both dates when moving back to Not started", () => {
		const result = computeDateUpdates(jobWithDates, "Not started", NOW);
		expect(result.date_phone_screen).toBeNull();
		expect(result.date_last_onsite).toBeNull();
	});

	it("clears both dates when moving back to Resume submitted", () => {
		const result = computeDateUpdates(jobWithDates, "Resume submitted", NOW);
		expect(result.date_phone_screen).toBeNull();
		expect(result.date_last_onsite).toBeNull();
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
