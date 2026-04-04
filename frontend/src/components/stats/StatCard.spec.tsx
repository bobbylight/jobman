import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import StatCard from "./StatCard";

describe("StatCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the label", () => {
		render(<StatCard label="Total Applications" value={42} />);
		expect(screen.getByText("Total Applications")).toBeInTheDocument();
	});

	it("renders a numeric value", () => {
		render(<StatCard label="Active Pipeline" value={7} />);
		expect(screen.getByText("7")).toBeInTheDocument();
	});

	it("renders a string value", () => {
		render(<StatCard label="Response Rate" value="65%" />);
		expect(screen.getByText("65%")).toBeInTheDocument();
	});

	it("renders the subtitle when provided", () => {
		render(
			<StatCard
				label="Total Applications"
				value={10}
				subtitle="Excluding withdrawn"
			/>,
		);
		expect(screen.getByText("Excluding withdrawn")).toBeInTheDocument();
	});

	it("does not render a subtitle element when subtitle is omitted", () => {
		render(<StatCard label="Offers Received" value={1} />);
		expect(screen.queryByText(/Excluding/)).not.toBeInTheDocument();
	});
});
