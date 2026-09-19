import { describe, it, expect } from "vitest";
import { assertCalendarAccess } from "./calendar-access";
import { Microsoft365NotConnectedError } from "../http/api-errors";

describe("assertCalendarAccess", () => {
  it("throws not connected for unknown session", () => {
    expect(() => assertCalendarAccess("user-with-no-microsoft-link")).toThrow(
      Microsoft365NotConnectedError
    );
  });
});
