import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TopCompaniesTable from "./TopCompaniesTable";

const TOP_COMPANIES = [
	{
		company: "Acme Corp",
		applications: 3,
		active: 2,
		bestStage: "Interviewing",
	},
	{
		company: "Globex",
		applications: 2,
		active: 1,
		bestStage: "Phone screen",
	},
	{
		company: "Initech",
		applications: 1,
		active: 0,
		bestStage: "Rejected/Withdrawn",
	},
];

describe("TopCompaniesTable", () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows empty state when topCompanies is empty", () => {
		render(<TopCompaniesTable topCompanies={[]} />);
		expect(screen.getByText("No applications yet")).toBeInTheDocument();
	});

	it("does not render a table when data is empty", () => {
		render(<TopCompaniesTable topCompanies={[]} />);
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("renders table headers", () => {
		render(<TopCompaniesTable topCompanies={TOP_COMPANIES} />);
		expect(screen.getByText("Company")).toBeInTheDocument();
		expect(screen.getByText("Applications")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Best Stage")).toBeInTheDocument();
	});

	it("renders a row for each company", () => {
		render(<TopCompaniesTable topCompanies={TOP_COMPANIES} />);
		expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		expect(screen.getByText("Globex")).toBeInTheDocument();
		expect(screen.getByText("Initech")).toBeInTheDocument();
	});

	it("renders application and active counts for each row", () => {
		render(<TopCompaniesTable topCompanies={TOP_COMPANIES} />);
		// "3" is unique (Acme applications); "0" is unique (Initech active)
		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
		// "2" appears twice: Acme active + Globex applications
		expect(screen.getAllByText("2")).toHaveLength(2);
		// "1" appears twice: Globex active + Initech applications
		expect(screen.getAllByText("1")).toHaveLength(2);
	});

	it("renders best stage as a chip label for each row", () => {
		render(<TopCompaniesTable topCompanies={TOP_COMPANIES} />);
		expect(screen.getByText("Interviewing")).toBeInTheDocument();
		expect(screen.getByText("Phone screen")).toBeInTheDocument();
		expect(screen.getByText("Rejected/Withdrawn")).toBeInTheDocument();
	});

	it("renders all rows when given a full list of 5 companies", () => {
		const FIVE_COMPANIES = [
			{ company: "A", applications: 5, active: 3, bestStage: "Offer!" },
			{ company: "B", applications: 4, active: 2, bestStage: "Interviewing" },
			{ company: "C", applications: 3, active: 1, bestStage: "Phone screen" },
			{
				company: "D",
				applications: 2,
				active: 0,
				bestStage: "Rejected/Withdrawn",
			},
			{
				company: "E",
				applications: 1,
				active: 1,
				bestStage: "Resume submitted",
			},
		];
		render(<TopCompaniesTable topCompanies={FIVE_COMPANIES} />);
		// 1 header row + 5 data rows
		expect(screen.getAllByRole("row")).toHaveLength(6);
	});
});
