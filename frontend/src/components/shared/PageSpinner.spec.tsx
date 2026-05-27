import React from "react";
import { render, screen } from "@testing-library/react";

import PageSpinner from "./PageSpinner";

describe("pageSpinner", () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders a circular progress indicator", () => {
		render(<PageSpinner />);
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});
});
