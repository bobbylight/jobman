import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PipelineFunnelChart from "./PipelineFunnelChart";

const TRANSITIONS = [
	{ count: 5, from: "Direct", to: "Applied" },
	{ count: 2, from: "Recruited", to: "Applied" },
	{ count: 1, from: "Referred", to: "Applied" },
	{ count: 5, from: "Applied", to: "Phone screen" },
	{ count: 3, from: "Applied", to: "Rejected/Withdrawn" },
	{ count: 3, from: "Phone screen", to: "Interviewing" },
	{ count: 2, from: "Phone screen", to: "Rejected/Withdrawn" },
	{ count: 1, from: "Interviewing", to: "Offer!" },
	{ count: 2, from: "Interviewing", to: "Rejected/Withdrawn" },
];

describe(PipelineFunnelChart, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Jsdom does not implement ResizeObserver
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		);
	});

	it("shows empty state when transitions is empty", () => {
		render(<PipelineFunnelChart transitions={[]} />);
		expect(screen.getByText("No data for this period")).toBeInTheDocument();
		expect(screen.queryByTestId("sankey-chart")).not.toBeInTheDocument();
	});

	it("renders the Sankey chart when there are transitions", () => {
		render(<PipelineFunnelChart transitions={TRANSITIONS} />);
		expect(screen.getByTestId("sankey-chart")).toBeInTheDocument();
		expect(
			screen.queryByText("No data for this period"),
		).not.toBeInTheDocument();
	});

	it("renders a text label for each pipeline stage present in the data", () => {
		const { container } = render(
			<PipelineFunnelChart transitions={TRANSITIONS} />,
		);
		const svgText = container.querySelector("svg")?.textContent ?? "";
		expect(svgText).toContain("Applied");
		expect(svgText).toContain("Phone screen");
		expect(svgText).toContain("Direct");
		expect(svgText).toContain("Interviewing");
	});

	it("calls onLinkClick with the from/to stage names when a link path is clicked", () => {
		const onLinkClick = vi.fn();
		const { container } = render(
			<PipelineFunnelChart
				transitions={TRANSITIONS}
				onLinkClick={onLinkClick}
			/>,
		);
		const paths = container.querySelectorAll<SVGPathElement>("svg path");
		expect(paths.length).toBeGreaterThan(0);
		fireEvent.click(paths[0]!);
		expect(onLinkClick).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(String),
		);
	});

	it("applies a pointer cursor to link paths when onLinkClick is provided", () => {
		const { container } = render(
			<PipelineFunnelChart transitions={TRANSITIONS} onLinkClick={vi.fn()} />,
		);
		const path = container.querySelector<SVGPathElement>("svg path");
		expect(path?.style.cursor).toBe("pointer");
	});

	it("does not apply a cursor style to link paths when onLinkClick is not provided", () => {
		const { container } = render(
			<PipelineFunnelChart transitions={TRANSITIONS} />,
		);
		const path = container.querySelector<SVGPathElement>("svg path");
		expect(path?.style.cursor).toBe("");
	});

	it("shows a tooltip with job count on mouseenter and hides it on mouseleave", async () => {
		const { container } = render(
			<PipelineFunnelChart transitions={TRANSITIONS} />,
		);
		const path = container.querySelector<SVGPathElement>("svg path")!;

		fireEvent.mouseEnter(path);
		await waitFor(() =>
			expect(screen.getByText(/\d+ jobs/)).toBeInTheDocument(),
		);

		fireEvent.mouseLeave(path);
		await waitFor(() =>
			expect(screen.queryByText(/\d+ jobs/)).not.toBeInTheDocument(),
		);
	});
});
