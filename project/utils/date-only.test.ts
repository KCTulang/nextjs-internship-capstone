import { describe, expect, it } from "vitest";
import {
	isDateOnly,
	isDateOnlyOverdue,
	parseDateOnly,
	toDateOnly,
} from "./date-only";

describe("date-only utilities", () => {
	it("round-trips using local calendar components", () => {
		const parsed = parseDateOnly("2026-08-31");
		expect(parsed.getFullYear()).toBe(2026);
		expect(parsed.getMonth()).toBe(7);
		expect(parsed.getDate()).toBe(31);
		expect(toDateOnly(parsed)).toBe("2026-08-31");
	});

	it("rejects impossible calendar dates", () => {
		expect(isDateOnly("2026-02-29")).toBe(false);
		expect(isDateOnly("2026-13-01")).toBe(false);
	});

	it("compares dates without time or UTC conversion", () => {
		const today = new Date(2026, 7, 31, 23, 59, 59);
		expect(isDateOnlyOverdue("2026-08-30", today)).toBe(true);
		expect(isDateOnlyOverdue("2026-08-31", today)).toBe(false);
	});
});
