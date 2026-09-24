import { fireEvent, render, screen } from "@testing-library/react";
import { Seat } from "@/app/components/seat";

describe("Seat", () => {
  it("calls onSelect when an available seat is clicked", () => {
    const onSelect = jest.fn();

    render(<Seat row="A" number={3} status="available" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Row A, Seat 3, available");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("does not call onSelect when a booked seat is clicked", () => {
    const onSelect = jest.fn();

    render(<Seat row="D" number={4} status="booked" onSelect={onSelect} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(onSelect).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("aria-label", "Row D, Seat 4, booked");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("marks selected seats as pressed", () => {
    render(<Seat row="B" number={2} status="selected" />);

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});
