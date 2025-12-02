import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Signup from "./Signup";
import { MemoryRouter } from "react-router-dom";
import { signupUser } from "./api";


const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock lucide-react icon
jest.mock("lucide-react", () => ({
    UserPlus: () => <div>Icon</div>,
}));

jest.mock("./api");

describe("Signup Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        window.alert = jest.fn();
    });

    test("renders all input fields and button", () => {
        render(
            <MemoryRouter>
                <Signup />
            </MemoryRouter>
        );

        expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/User ID/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
        expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
    });

    test("typing into input fields works", () => {
        render(
            <MemoryRouter>
                <Signup />
            </MemoryRouter>
        );

        const emailInput = screen.getByPlaceholderText(/Email/i);
        const userIdInput = screen.getByPlaceholderText(/User ID/i);
        const passwordInput = screen.getByPlaceholderText(/Password/i);

        fireEvent.change(emailInput, { target: { value: "test@test.com" } });
        fireEvent.change(userIdInput, { target: { value: "testuser" } });
        fireEvent.change(passwordInput, { target: { value: "password" } });

        expect(emailInput.value).toBe("test@test.com");
        expect(userIdInput.value).toBe("testuser");
        expect(passwordInput.value).toBe("password");
    });

    test("alerts when fields are empty", () => {
        render(
            <MemoryRouter>
                <Signup />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByText(/Sign Up/i));
        expect(window.alert).toHaveBeenCalledWith("Fill all fields");
    });

    test("successful signup shows alert and navigates", async () => {
        signupUser.mockResolvedValue({});

        render(
            <MemoryRouter>
                <Signup />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByPlaceholderText(/User ID/i), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "password" } });

        fireEvent.click(screen.getByText(/Sign Up/i));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Signup successful! Please log in.");
            expect(mockNavigate).toHaveBeenCalledWith("/login");
        });
    });

    test("signup failure with API error message shows alert", async () => {
        signupUser.mockRejectedValue({ response: { data: { detail: "Email exists" } } });

        render(
            <MemoryRouter>
                <Signup />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "exists@test.com" } });
        fireEvent.change(screen.getByPlaceholderText(/User ID/i), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "password" } });

        fireEvent.click(screen.getByText(/Sign Up/i));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Email exists");
        });
    });

    test("signup failure without API detail shows generic alert", async () => {
        signupUser.mockRejectedValue({});

        render(
            <MemoryRouter>
                <Signup />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: "test@test.com" } });
        fireEvent.change(screen.getByPlaceholderText(/User ID/i), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "password" } });

        fireEvent.click(screen.getByText(/Sign Up/i));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Signup failed");
        });
    });
});
