import { fireEvent, render, screen } from "@testing-library/react";
import { ToolConfirmation } from "@/app/components/tool-confirmation";

describe("ToolConfirmation", () => {
    it("renders confirmation details and handles approve and reject actions", () => {
        const onApprove = jest.fn();
        const onReject = jest.fn();

        render(
            <ToolConfirmation
                toolCallId="cancel-123"
                title="Cancel booking?"
                description="This cannot be undone."
                onApprove={onApprove}
                onReject={onReject}
            />,
        );

        expect(screen.getByRole("group")).toHaveAttribute(
            "aria-labelledby",
            "tool-confirmation-title-cancel-123",
        );
        expect(screen.getByRole("heading", { name: "Cancel booking?" })).toBeInTheDocument();
        expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Approve" }));
        fireEvent.click(screen.getByRole("button", { name: "Reject" }));

        expect(onApprove).toHaveBeenCalledTimes(1);
        expect(onReject).toHaveBeenCalledTimes(1);
    });
});
