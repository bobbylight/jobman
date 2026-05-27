import React from "react";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

describe(Footer, () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders the copyright notice with the current year", () => {
		render(<Footer />);
		expect(
			screen.getByText(`© ${new Date().getFullYear()} JobMan`),
		).toBeInTheDocument();
	});

	it("renders the MIT License link", () => {
		render(<Footer />);
		expect(
			screen.getByRole("link", { name: "MIT License" }),
		).toBeInTheDocument();
	});

	it("MIT License link points to the correct URL", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: "MIT License" })).toHaveAttribute(
			"href",
			"https://github.com/bobbylight/jobman/blob/main/LICENSE",
		);
	});

	it("MIT License link opens in a new tab", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: "MIT License" })).toHaveAttribute(
			"target",
			"_blank",
		);
	});

	it("MIT License link has noopener noreferrer rel", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: "MIT License" })).toHaveAttribute(
			"rel",
			"noopener noreferrer",
		);
	});

	it("renders the GitHub link", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
	});

	it("GitHub link points to the correct URL", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
			"href",
			"https://github.com/bobbylight/jobman",
		);
	});

	it("GitHub link opens in a new tab", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
			"target",
			"_blank",
		);
	});

	it("GitHub link has noopener noreferrer rel", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
			"rel",
			"noopener noreferrer",
		);
	});
});
