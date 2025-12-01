import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "./Login";
import { MemoryRouter } from "react-router-dom";
import { loginUser } from "./api";

// Mock navigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock lucide-react
jest.mock("lucide-react", () => ({
    LogIn: () => <div>Icon</div>,
}));

jest.mock("./api");

describe("Login Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        window.alert = jest.fn();
    });

    test("renders login page correctly", () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );
        expect(screen.getByText(/AI Career Mentor/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/User ID/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
        expect(screen.getByText(/Log In/i)).toBeInTheDocument();
        expect(screen.getByText(/Sign up/i)).toBeInTheDocument();
    });

    test("can type into userId and password fields", () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        const userInput = screen.getByPlaceholderText(/User ID/i);
        const passInput = screen.getByPlaceholderText(/Password/i);

        fireEvent.change(userInput, { target: { value: "testuser" } });
        fireEvent.change(passInput, { target: { value: "mypassword" } });

        expect(userInput.value).toBe("testuser");
        expect(passInput.value).toBe("mypassword");
    });

    test("alerts when submitting empty fields", async () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByText(/Log In/i));
        expect(window.alert).toHaveBeenCalledWith("Fill all fields");
    });

    test("successful login sets localStorage and navigates", async () => {
        loginUser.mockResolvedValue({ status: 200 });

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/User ID/i), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "mypassword" } });

        // Submit form explicitly to cover preventDefault branch
        fireEvent.submit(screen.getByRole("form"));

        await waitFor(() => {
            expect(localStorage.getItem("userId")).toBe("testuser");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
        });
    });

    test("failed login shows alert with API error message", async () => {
        loginUser.mockRejectedValue({
            response: { data: { detail: "Invalid credentials" } },
        });

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/User ID/i), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "wrongpass" } });

        fireEvent.click(screen.getByText(/Log In/i));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Invalid credentials");
        });
    });

    test("failed login shows generic alert if no response data", async () => {
        loginUser.mockRejectedValue({});

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/User ID/i), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: "wrongpass" } });

        fireEvent.click(screen.getByText(/Log In/i));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Login failed");
        });
    });
});
