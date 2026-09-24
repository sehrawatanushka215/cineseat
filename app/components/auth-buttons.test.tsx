import { render, screen } from "@testing-library/react";
import { AuthButtons } from "@/app/components/auth-buttons";
import { auth } from "@/auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

describe("AuthButtons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders sign-in when no session is present", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);

    const result = await AuthButtons();
    render(result);

    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });

  it("renders sign-out when a user is signed in", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { email: "viewer@example.com" },
    });

    const result = await AuthButtons();
    render(result);

    expect(screen.getByText("Signed in as viewer@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
