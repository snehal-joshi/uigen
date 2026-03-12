// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// Must be mocked before importing auth.ts
vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookieStore),
}));

// Import after mocks are set up
const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

const TEST_SECRET = new TextEncoder().encode("development-secret-key");

async function makeValidToken(payload: object, expiresIn = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(TEST_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// createSession

test("createSession sets an httpOnly cookie", async () => {
  await createSession("user-1", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, , options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(options.httpOnly).toBe(true);
  expect(options.path).toBe("/");
});

test("createSession cookie value is a valid JWT containing userId and email", async () => {
  await createSession("user-1", "test@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(token, TEST_SECRET);

  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("test@example.com");
});

test("createSession sets cookie expiry approximately 7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "test@example.com");
  const after = Date.now();

  const [, , options] = mockCookieStore.set.mock.calls[0];
  const expiresMs = options.expires.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

// getSession

test("getSession returns null when no cookie is present", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an invalid token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const expiredToken = await makeValidToken(
    { userId: "user-1", email: "test@example.com" },
    "-1s"
  );
  mockCookieStore.get.mockReturnValue({ value: expiredToken });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const token = await makeValidToken({
    userId: "user-1",
    email: "test@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("test@example.com");
});

// deleteSession

test("deleteSession deletes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledOnce();
  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

// verifySession

test("verifySession returns null when no cookie on request", async () => {
  const request = {
    cookies: { get: vi.fn().mockReturnValue(undefined) },
  } as any;

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns null for an invalid token on request", async () => {
  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: "bad.token.here" }) },
  } as any;

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns null for an expired token on request", async () => {
  const expiredToken = await makeValidToken(
    { userId: "user-1", email: "test@example.com" },
    "-1s"
  );
  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: expiredToken }) },
  } as any;

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns session payload for a valid token on request", async () => {
  const token = await makeValidToken({
    userId: "user-2",
    email: "other@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: token }) },
  } as any;

  const session = await verifySession(request);

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-2");
  expect(session?.email).toBe("other@example.com");
});
