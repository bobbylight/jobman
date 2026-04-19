import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			exclude: ["*.spec.ts", "vitest.config.ts"],
			include: ["*.ts"],
			provider: "v8",
			reporter: ["text", "lcov"],
		},
		environment: "node",
		globals: true,
	},
});
