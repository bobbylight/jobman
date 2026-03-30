import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "./LoginPage";

describe("LoginPage", () => {
	it("renders the app name", () => {
		render(<LoginPage />);
		expect(screen.getByText("JobMan")).toBeInTheDocument();
	});

	it("renders the tagline", () => {
		render(<LoginPage />);
		expect(screen.getByText(/Track your job applications/)).toBeInTheDocument();
	});

	it("renders a 'Continue with Google' link", () => {
		render(<LoginPage />);
		expect(
			screen.getByRole("link", { name: "Continue with Google" }),
		).toBeInTheDocument();
	});

	it("links to the Google OAuth endpoint", () => {
		render(<LoginPage />);
		expect(
			screen.getByRole("link", { name: "Continue with Google" }),
		).toHaveAttribute("href", "/api/auth/google");
	});
});
