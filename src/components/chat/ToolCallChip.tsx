"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

export function getToolCallLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  const path = typeof args.path === "string" ? args.path : "";
  const filename = path.split("/").filter(Boolean).pop() ?? path;

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":      return `Creating ${filename}`;
      case "str_replace": return `Editing ${filename}`;
      case "insert":      return `Editing ${filename}`;
      case "view":        return `Reading ${filename}`;
      case "undo_edit":   return `Undoing edit to ${filename}`;
      default:            return toolName;
    }
  }

  if (toolName === "file_manager") {
    const newPath = typeof args.new_path === "string" ? args.new_path : "";
    const newFilename = newPath.split("/").filter(Boolean).pop() ?? newPath;
    switch (args.command) {
      case "rename": return `Renaming ${filename} to ${newFilename}`;
      case "delete": return `Deleting ${filename}`;
      default:       return toolName;
    }
  }

  return toolName;
}

interface ToolCallChipProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallChip({ toolInvocation }: ToolCallChipProps) {
  const label = getToolCallLabel(
    toolInvocation.toolName,
    toolInvocation.args as Record<string, unknown>
  );
  const isDone = toolInvocation.state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
