import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth — initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("useAuth — signIn", () => {
  test("sets isLoading to true while in-flight, then false on completion", async () => {
    let resolveSignIn!: (v: any) => void;
    (signInAction as any).mockReturnValue(
      new Promise((res) => (resolveSignIn = res))
    );
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "new-1" });
    (getAnonWorkData as any).mockReturnValue(null);

    const { result } = renderHook(() => useAuth());

    let promise: Promise<any>;
    act(() => {
      promise = result.current.signIn("a@b.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("returns the result from the server action", async () => {
    (signInAction as any).mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("a@b.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("sets isLoading to false even when the action throws", async () => {
    (signInAction as any).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when sign-in fails", async () => {
    (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "wrong");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("calls signInAction with the provided credentials", async () => {
    (signInAction as any).mockResolvedValue({ success: false, error: "err" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "mypassword");
    });

    expect(signInAction).toHaveBeenCalledWith("user@example.com", "mypassword");
  });
});

describe("useAuth — signUp", () => {
  test("sets isLoading to true while in-flight, then false on completion", async () => {
    let resolveSignUp!: (v: any) => void;
    (signUpAction as any).mockReturnValue(
      new Promise((res) => (resolveSignUp = res))
    );
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "new-1" });
    (getAnonWorkData as any).mockReturnValue(null);

    const { result } = renderHook(() => useAuth());

    let promise: Promise<any>;
    act(() => {
      promise = result.current.signUp("a@b.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: true });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("returns the result from the server action", async () => {
    (signUpAction as any).mockResolvedValue({
      success: false,
      error: "Email already registered",
    });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("existing@b.com", "password123");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
  });

  test("sets isLoading to false even when the action throws", async () => {
    (signUpAction as any).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("a@b.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when sign-up fails", async () => {
    (signUpAction as any).mockResolvedValue({ success: false, error: "err" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("a@b.com", "password123");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("useAuth — post-sign-in navigation", () => {
  test("saves anon work as a new project and navigates to it", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/App.jsx": { type: "file", content: "" } },
    };
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(anonWork);
    (createProject as any).mockResolvedValue({ id: "anon-proj-1" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      })
    );
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-proj-1");
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("does not save anon work when messages array is empty", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
    (getProjects as any).mockResolvedValue([{ id: "existing-1" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password123");
    });

    expect(createProject).not.toHaveBeenCalled();
    expect(clearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-1");
  });

  test("navigates to the most recent existing project when no anon work", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([
      { id: "proj-newest" },
      { id: "proj-older" },
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-newest");
    expect(createProject).not.toHaveBeenCalled();
  });

  test("creates a new project and navigates to it when the user has no projects", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "brand-new" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password123");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  test("same post-sign-in logic runs after a successful signUp", async () => {
    (signUpAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@b.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-1");
  });
});
