import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login, { validateLogin, handleLoginWrapper } from "./Login";
import { MemoryRouter } from "react-router-dom";
import { loginUser } from "./api";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

jest.mock("lucide-react", () => ({ LogIn: () => <div>Icon</div> }));
jest.mock("./api");

describe("Login Component & handleLoginWrapper", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        window.alert = jest.fn();
    });


    test("validateLogin works", () => {
        expect(validateLogin("", "")).toBe("Fill all fields");
        expect(validateLogin("user", "")).toBe("Fill all fields");
        expect(validateLogin("", "pass")).toBe("Fill all fields");
        expect(validateLogin("user", "pass")).toBeNull();
    });


    test("handleLoginWrapper alerts on empty fields", async () => {
        await handleLoginWrapper("", "", loginUser, mockNavigate, window.alert);
        expect(window.alert).toHaveBeenCalledWith("Fill all fields");
    });

    test("handleLoginWrapper successful login", async () => {
        loginUser.mockResolvedValue({ status: 200 });
        await handleLoginWrapper("user", "pass", loginUser, mockNavigate, window.alert);

        expect(localStorage.getItem("userId")).toBe("user");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    test("handleLoginWrapper resolves non-200 status", async () => {
        loginUser.mockResolvedValue({ status: 400 });
        await handleLoginWrapper("user", "pass", loginUser, mockNavigate, window.alert);

        expect(localStorage.getItem("userId")).toBeNull();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("handleLoginWrapper API rejects with error detail", async () => {
        loginUser.mockRejectedValue({ response: { data: { detail: "Invalid credentials" } } });
        await handleLoginWrapper("user", "pass", loginUser, mockNavigate, window.alert);

        expect(window.alert).toHaveBeenCalledWith("Invalid credentials");
    });

    test("handleLoginWrapper API rejects with no response", async () => {
        loginUser.mockRejectedValue({});
        await handleLoginWrapper("user", "pass", loginUser, mockNavigate, window.alert);

        expect(window.alert).toHaveBeenCalledWith("Login failed");
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

    test("can type into fields", () => {
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
});
