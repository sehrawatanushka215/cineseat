import { render, screen } from "@testing-library/react";
import { ToolCallDisplay } from "@/app/components/tool-call-display";

describe("ToolCallDisplay", () => {
    it.each(["input-streaming", "input-available"])(
        "shows a running message for the %s state",
        (state) => {
            render(<ToolCallDisplay toolName="searchShowtimes" state={state} />);

            expect(screen.getByText("Search Showtimes is running...")).toBeInTheDocument();
        },
    );

    it("shows a completed message for the output-available state", () => {
        render(<ToolCallDisplay toolName="bookShowtime" state="output-available" />);

        expect(screen.getByText("Book Showtime completed.")).toBeInTheDocument();
        expect(screen.getByText("✓")).toHaveAttribute("aria-hidden", "true");
    });

    it.each(["input-error", "output-error", "unknown"])(
        "renders nothing for the unsupported %s state",
        (state) => {
            const { container } = render(
                <ToolCallDisplay toolName="searchShowtimes" state={state} />,
            );

            expect(container).toBeEmptyDOMElement();
        },
    );
});
