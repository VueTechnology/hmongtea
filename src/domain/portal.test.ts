import { expect, test } from "bun:test";
import { portalHome, portalOf } from "#/domain/portal";

test("a retail customer lands in the customer portal", () => {
	expect(portalOf({ role: "customer", side: "retail" })).toBe("customer");
	expect(portalHome("customer")).toBe("/account");
});

test("a wholesale customer lands in the partner portal", () => {
	expect(portalOf({ role: "customer", side: "wholesale" })).toBe("partner");
	expect(portalHome("partner")).toBe("/wholesale/desk");
});

test("staff lands in the staff portal", () => {
	expect(portalOf({ role: "staff", side: "retail" })).toBe("staff");
	expect(portalHome("staff")).toBe("/staff");
});

test("an unknown role has no portal", () => {
	expect(portalOf({ role: "owner", side: "retail" })).toBeNull();
});
