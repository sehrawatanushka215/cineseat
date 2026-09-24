"use client";



export type ToolCallDisplayProps = {
  toolName: string,
  state: string,
};

export function ToolCallDisplay({ toolName, state }: ToolCallDisplayProps) {
  const label = toolName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="tool-call">
        <span>{label} is running...</span>
      </div>
    );
  }

  if (state === "output-available") {
    return (
      <div className="tool-call">
        <span aria-hidden="true">✓</span>
        <span>{label} completed.</span>
      </div>
    );
  }

  return null;
}
