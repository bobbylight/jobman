import { tagChipProps } from "./constants";

describe("tagChipProps", () => {
	it("returns the named MUI color for 'faang' (error)", () => {
		expect(tagChipProps("faang")).toStrictEqual({ color: "error" });
	});

	it("returns the named MUI color for 'remote' (info)", () => {
		expect(tagChipProps("remote")).toStrictEqual({ color: "info" });
	});

	it("returns the named MUI color for 'high-pay' (success)", () => {
		expect(tagChipProps("high-pay")).toStrictEqual({ color: "success" });
	});

	it("returns the named MUI color for 'hybrid' (secondary)", () => {
		expect(tagChipProps("hybrid")).toStrictEqual({ color: "secondary" });
	});

	it("returns the named MUI color for 'in-office' (warning)", () => {
		expect(tagChipProps("in-office")).toStrictEqual({ color: "warning" });
	});

	it("returns the named MUI color for 'startup' (primary)", () => {
		expect(tagChipProps("startup")).toStrictEqual({ color: "primary" });
	});

	it("returns default color with border sx for 'faang-adjacent' (hex) when not filled", () => {
		const result = tagChipProps("faang-adjacent");
		expect(result.color).toBe("default");
		expect(result.sx).toStrictEqual({
			borderColor: "#00897b",
			color: "#00897b",
		});
	});

	it("returns default color with background sx for 'faang-adjacent' (hex) when filled", () => {
		const result = tagChipProps("faang-adjacent", true);
		expect(result.color).toBe("default");
		expect(result.sx).toStrictEqual({
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
