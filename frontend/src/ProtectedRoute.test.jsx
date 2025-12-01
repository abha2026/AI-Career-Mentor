import React from "react";
import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import ProtectedRoute from "./ProtectedRoute";
import { MemoryRouter } from "react-router-dom";
import { Navigate } from "react-router-dom";

// Mock Navigate to inspect rendering
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    Navigate: jest.fn(() => null),
}));

describe("ProtectedRoute Component", () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    test("renders children if userId exists", () => {
        localStorage.setItem("userId", "123");
        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );
        expect(screen.getByText(/Protected Content/i)).toBeInTheDocument();
    });

    test("redirects to login if userId missing", () => {
        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );
        // Navigate should be called
        expect(Navigate).toHaveBeenCalledWith(
            { to: "/login", replace: true },
            {}
        );
        // Children should not render
        expect(screen.queryByText(/Protected Content/i)).not.toBeInTheDocument();
    });
});
