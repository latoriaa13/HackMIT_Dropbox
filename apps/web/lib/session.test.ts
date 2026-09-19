import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSet = vi.fn();
const mockGet = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockGet,
    set: mockSet,
  })),
}));

import {
  buildSessionCookieValue,
  ensureServerSession,
  getServerSession,
  newSessionId,
  verifySessionCookie,
} from "./session";

describe("session cookie policy", () => {
  beforeEach(() => {
    mockSet.mockClear();
    mockGet.mockClear();
    process.env.SESSION_SECRET = "test-session-secret-min-16";
    delete process.env.NODE_ENV;
  });

  it("getServerSession does not mutate cookies when missing", async () => {
    mockGet.mockReturnValue(undefined);
    const { sessionId } = await getServerSession();
    expect(sessionId).toBeNull();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("getServerSession reads an existing signed session", async () => {
    const id = newSessionId();
    mockGet.mockReturnValue({ value: buildSessionCookieValue(id) });
    const { sessionId } = await getServerSession();
    expect(sessionId).toBe(id);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("ensureServerSession creates a cookie in route-handler context", async () => {
    mockGet.mockReturnValue(undefined);
    const id = await ensureServerSession();
    expect(id).toBeTruthy();
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet.mock.calls[0][0]).toBe("tuesday_session");
  });

  it("ensureServerSession reuses a valid existing cookie", async () => {
    const id = newSessionId();
    const signed = buildSessionCookieValue(id);
    mockGet.mockReturnValue({ value: signed });
    const resolved = await ensureServerSession();
    expect(resolved).toBe(id);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("verifySessionCookie rejects tampered values", () => {
    const id = newSessionId();
    const signed = buildSessionCookieValue(id);
    expect(verifySessionCookie(signed)).toBe(id);
    expect(verifySessionCookie(`${id}.bad-signature`)).toBeNull();
  });
});
