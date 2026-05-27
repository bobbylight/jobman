import React from "react";
import { act, render, screen } from "@testing-library/react";
import StatCard from "./StatCard";

describe(StatCard, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders the label", () => {
		render(<StatCard label="Total Applications" value={42} />);
		expect(screen.getByText("Total Applications")).toBeInTheDocument();
	});

	it("starts at 0 and animates to the final value", () => {
		render(<StatCard label="Active Pipeline" value={30} />);
		expect(screen.getByText("0")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(700);
		});
		expect(screen.getByText("30")).toBeInTheDocument();
	});

	it("renders a null value as an em dash without animating", () => {
		render(<StatCard label="Response Rate" value={null} />);
		expect(screen.getByText("—")).toBeInTheDocument();
	});

	it("renders a zero value immediately without animating", () => {
		render(<StatCard label="Offers Received" value={0} />);
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("appends the suffix after the animated value", () => {
		render(<StatCard label="Response Rate" value={65} suffix="%" />);

		act(() => {
			vi.advanceTimersByTime(700);
		});
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
