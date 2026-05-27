import React from "react";
import { render, screen } from "@testing-library/react";

import ChartCard from "./ChartCard";

describe("chartCard", () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders the title", () => {
		render(
			<ChartCard title="My Chart">
				<div>content</div>
			</ChartCard>,
		);
		expect(screen.getByText("My Chart")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(
			<ChartCard title="My Chart">
				<div>chart content</div>
			</ChartCard>,
		);
		expect(screen.getByText("chart content")).toBeInTheDocument();
	});

	it("renders the title as subtitle2 typography", () => {
		render(
			<ChartCard title="My Chart">
				<div />
			</ChartCard>,
		);
		expect(screen.getByText("My Chart")).toHaveClass("MuiTypography-subtitle2");
	});
});
