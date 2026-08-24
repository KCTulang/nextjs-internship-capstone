import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/e2e/**",
			"playwright.config.ts",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			exclude: [
				".next/**",
				"components/ui/**",
				"lib/db/migrations/**",
				"e2e/**",
				"playwright.config.ts",
			],
		},
		projects: [
			{
				test: {
					name: "components",
					include: ["**/*.test.tsx"],
					exclude: ["**/node_modules/**", "**/dist/**"],
					environment: "jsdom",
					setupFiles: ["./vitest.setup.ts"],
				},
				resolve: {
					alias: {
						"@": path.resolve(import.meta.dirname, "./"),
					},
				},
			},
			{
				test: {
					name: "backend",
					include: ["**/*.test.ts"],
					exclude: [
						"**/node_modules/**",
						"**/dist/**",
						"**/e2e/**",
						"playwright.config.ts",
					],
					environment: "node",
				},
				resolve: {
					alias: {
						"@": path.resolve(import.meta.dirname, "./"),
					},
				},
			},
		],
	},
});
