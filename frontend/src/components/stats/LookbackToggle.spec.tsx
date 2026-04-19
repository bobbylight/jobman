import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import LookbackToggle from "./LookbackToggle";

describe(LookbackToggle, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders all three time window options", () => {
		render(<LookbackToggle value="all" onChange={vi.fn()} />);
		expect(
			screen.getByRole("button", { name: "Last 30 days" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Last 90 days" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "All time" }),
		).toBeInTheDocument();
	});

	it("calls onChange with '30' when Last 30 days is clicked", () => {
		const onChange = vi.fn();
		render(<LookbackToggle value="all" onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
		expect(onChange).toHaveBeenCalledWith("30");
	});

	it("calls onChange with '90' when Last 90 days is clicked", () => {
		const onChange = vi.fn();
		render(<LookbackToggle value="all" onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: "Last 90 days" }));
		expect(onChange).toHaveBeenCalledWith("90");
	});

	it("calls onChange with 'all' when All time is clicked", () => {
		const onChange = vi.fn();
		render(<LookbackToggle value="30" onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: "All time" }));
		expect(onChange).toHaveBeenCalledWith("all");
	});

	it("does not call onChange when the currently selected option is clicked again", () => {
		const onChange = vi.fn();
		render(<LookbackToggle value="all" onChange={onChange} />);
		// Clicking the already-selected button deselects it (MUI passes null);
		// The component guards against this and should not call onChange.
		fireEvent.click(screen.getByRole("button", { name: "All time" }));
		expect(onChange).not.toHaveBeenCalled();
	});
});
