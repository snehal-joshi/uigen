import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolCallLabel, ToolCallChip } from "../ToolCallChip";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// getToolCallLabel unit tests

test("getToolCallLabel: str_replace_editor create", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/components/Button.jsx" })).toBe("Editing Button.jsx");
});

test("getToolCallLabel: str_replace_editor insert", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("getToolCallLabel: str_replace_editor view", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/utils/helpers.ts" })).toBe("Reading helpers.ts");
});

test("getToolCallLabel: str_replace_editor undo_edit", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit to App.jsx");
});

test("getToolCallLabel: str_replace_editor unknown command falls back to toolName", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "unknown", path: "/App.jsx" })).toBe("str_replace_editor");
});

test("getToolCallLabel: str_replace_editor nested path uses only filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/src/components/ui/Card.jsx" })).toBe("Creating Card.jsx");
});

test("getToolCallLabel: str_replace_editor missing path", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create" })).toBe("Creating ");
});

test("getToolCallLabel: file_manager rename", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "/App.jsx", new_path: "/Main.jsx" })).toBe("Renaming App.jsx to Main.jsx");
});

test("getToolCallLabel: file_manager delete", () => {
  expect(getToolCallLabel("file_manager", { command: "delete", path: "/old/Comp.jsx" })).toBe("Deleting Comp.jsx");
});

test("getToolCallLabel: file_manager rename missing new_path", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "/App.jsx" })).toBe("Renaming App.jsx to ");
});

test("getToolCallLabel: unknown tool returns toolName", () => {
  expect(getToolCallLabel("some_tool", {})).toBe("some_tool");
});

// ToolCallChip component tests

test("ToolCallChip shows green dot when state is result", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "ok",
  };

  const { container } = render(<ToolCallChip toolInvocation={toolInvocation} />);

  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallChip shows spinner when state is call", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "call",
  };

  const { container } = render(<ToolCallChip toolInvocation={toolInvocation} />);

  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallChip shows spinner when state is partial-call", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "partial-call",
  };

  const { container } = render(<ToolCallChip toolInvocation={toolInvocation} />);

  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallChip renders correct friendly label", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "ok",
  };

  render(<ToolCallChip toolInvocation={toolInvocation} />);

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("ToolCallChip outer wrapper has expected Tailwind classes", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "call",
  };

  const { container } = render(<ToolCallChip toolInvocation={toolInvocation} />);
  const wrapper = container.firstChild as HTMLElement;

  expect(wrapper.className).toContain("inline-flex");
  expect(wrapper.className).toContain("bg-neutral-50");
  expect(wrapper.className).toContain("rounded-lg");
  expect(wrapper.className).toContain("border-neutral-200");
});
