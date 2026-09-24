'use client';

export type ToolConfirmationProps = {
    toolCallId: string,
    title: string,
    description: string,
    onApprove: () => void,
    onReject: () => void,
}


export function ToolConfirmation({
    toolCallId,
    title,
    description,
    onApprove,
    onReject,
}: ToolConfirmationProps) {
    return (
        <div className="tool-confirmation" role="group" aria-labelledby={`tool-confirmation-title-${toolCallId}`}>
            <h2 id={`tool-confirmation-title-${toolCallId}`}>{title}</h2>
            <p>{description}</p>
            <div className="tool-confirmation__actions">
                <button type="button" className="button" onClick={onApprove}>Approve</button>
                <button type="button" className="button" onClick={onReject}>Reject</button>
            </div>
        </div>
    );
}
