import { tagChipProps } from "./constants";

describe(tagChipProps, () => {
	it("returns the named MUI color for 'faang' (error)", () => {
		expect(tagChipProps("faang")).toEqual({ color: "error" });
	});

	it("returns the named MUI color for 'remote' (info)", () => {
		expect(tagChipProps("remote")).toEqual({ color: "info" });
	});

	it("returns the named MUI color for 'high-pay' (success)", () => {
		expect(tagChipProps("high-pay")).toEqual({ color: "success" });
	});

	it("returns the named MUI color for 'hybrid' (secondary)", () => {
		expect(tagChipProps("hybrid")).toEqual({ color: "secondary" });
	});

	it("returns the named MUI color for 'in-office' (warning)", () => {
		expect(tagChipProps("in-office")).toEqual({ color: "warning" });
	});

	it("returns the named MUI color for 'startup' (primary)", () => {
		expect(tagChipProps("startup")).toEqual({ color: "primary" });
	});

	it("returns default color with border sx for 'faang-adjacent' (hex) when not filled", () => {
		const result = tagChipProps("faang-adjacent");
		expect(result.color).toBe("default");
		expect(result.sx).toEqual({ borderColor: "#00897b", color: "#00897b" });
	});

	it("returns default color with background sx for 'faang-adjacent' (hex) when filled", () => {
		const result = tagChipProps("faang-adjacent", true);
		expect(result.color).toBe("default");
		expect(result.sx).toEqual({
			backgroundColor: "#00897b",
			borderColor: "#00897b",
			color: "#fff",
		});
	});

	it("does not include sx for tags with named MUI colors", () => {
		expect(tagChipProps("faang")).not.toHaveProperty("sx");
		expect(tagChipProps("remote")).not.toHaveProperty("sx");
	});
});
