import { expect, test } from "bun:test";
import { noteSearch } from "./search";

test("a numeric query value stays a short string", () => {
	const notes = noteSearch({ joined: 1, sent: 3, saved: 1, error: "email" });
	expect(notes.joined).toBe("1");
	expect(notes.sent).toBe("3");
	expect(notes.saved).toBe("1");
	expect(notes.error).toBe("email");
	expect(noteSearch({ joined: "already" }).joined).toBe("already");
});
