import React from "react";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

describe("footer", () => {
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

	it("mIT License link points to the correct URL", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: "MIT License" })).toHaveAttribute(
			"href",
			"https://github.com/bobbylight/jobman/blob/main/LICENSE",
		);
	});

	it("mIT License link opens in a new tab", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: "MIT License" })).toHaveAttribute(
			"target",
			"_blank",
		);
	});

	it("mIT License link has noopener noreferrer rel", () => {
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

	it("gitHub link points to the correct URL", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
			"href",
			"https://github.com/bobbylight/jobman",
		);
	});

	it("gitHub link opens in a new tab", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
			"target",
			"_blank",
		);
	});

	it("gitHub link has noopener noreferrer rel", () => {
		render(<Footer />);
		expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
			"rel",
			"noopener noreferrer",
		);
	});
});
