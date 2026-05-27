import React from "react";
import { render, screen } from "@testing-library/react";
import CompanyLogo from "./CompanyLogo";
import { useCompanyLogo } from "../useCompanyLogo";

vi.mock(import("../useCompanyLogo"), () => ({
	useCompanyLogo: vi.fn(() => null),
}));

describe(CompanyLogo, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the company initial when logo src is null", () => {
		vi.mocked(useCompanyLogo).mockReturnValue(null);
		render(<CompanyLogo company="Acme Corp" />);
		expect(screen.getByText("A")).toBeInTheDocument();
	});

	it("renders an img with the logo src when available", () => {
		vi.mocked(useCompanyLogo).mockReturnValue("blob:mock-url");
		render(<CompanyLogo company="Acme Corp" />);
		const img = screen.getByRole("img", { name: "Acme Corp" });
		expect(img).toHaveAttribute("src", "blob:mock-url");
	});

	it("defaults to 20px dimensions", () => {
		render(<CompanyLogo company="Acme Corp" />);
		const avatar = screen.getByTestId("company-logo");
		expect(avatar).toHaveStyle({ height: "20px", width: "20px" });
	});

	it("applies custom size when provided", () => {
		render(<CompanyLogo company="Acme Corp" size={32} />);
		const avatar = screen.getByTestId("company-logo");
		expect(avatar).toHaveStyle({ height: "32px", width: "32px" });
	});
});
