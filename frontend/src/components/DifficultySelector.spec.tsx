import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import DifficultySelector from "./DifficultySelector";

// The dots have no accessible roles or labels; query via DOM structure:
// screen.getByText("Difficulty") → <span> Typography
// .nextElementSibling → <div> Box containing 5 dot divs
function getDots(): Element[] {
	const label = screen.getByText("Difficulty");
	const dotsContainer = label.nextElementSibling as HTMLElement;
	return Array.from(dotsContainer.children);
}

describe("DifficultySelector", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the Difficulty label", () => {
		render(<DifficultySelector value={3} />);
		expect(screen.getByText("Difficulty")).toBeInTheDocument();
	});

	it("renders exactly 5 dot elements", () => {
		render(<DifficultySelector value={3} />);
		expect(getDots()).toHaveLength(5);
	});

	describe("interactive mode", () => {
		it("calls onChange with the correct value when a dot is clicked", () => {
			const onChange = vi.fn();
			render(<DifficultySelector value={3} onChange={onChange} />);
			fireEvent.click(getDots()[4]!); // 5th dot → value 5
			expect(onChange).toHaveBeenCalledWith(5);
		});

		it("calls onChange with 1 when the first dot is clicked", () => {
			const onChange = vi.fn();
			render(<DifficultySelector value={3} onChange={onChange} />);
			fireEvent.click(getDots()[0]!);
			expect(onChange).toHaveBeenCalledWith(1);
		});

		it("calls onChange with the matching index for each dot", () => {
			const onChange = vi.fn();
			render(<DifficultySelector value={1} onChange={onChange} />);
			const dots = getDots();
			[1, 2, 3, 4, 5].forEach((expectedValue, i) => {
				fireEvent.click(dots[i]!);
				expect(onChange).toHaveBeenCalledWith(expectedValue);
			});
		});
	});

	describe("readOnly mode", () => {
		it("does not call onChange when a dot is clicked", () => {
			const onChange = vi.fn();
			render(<DifficultySelector value={3} onChange={onChange} readOnly />);
			fireEvent.click(getDots()[4]!);
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	it("does not throw when clicked without an onChange prop", () => {
		render(<DifficultySelector value={3} />);
		expect(() => fireEvent.click(getDots()[2]!)).not.toThrow();
	});
});
