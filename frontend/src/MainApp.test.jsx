import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import '@testing-library/jest-dom';
import MainApp from "./MainApp";

jest.mock("./api", () => ({
    getRoadmap: jest.fn(),
}));

import { getRoadmap } from "./api";

describe("MainApp Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.setItem("token", "abc");
    });

    test("renders main app with form inputs", () => {
        render(<MainApp />);
        expect(screen.getByPlaceholderText(/Target Role/i)).toBeInTheDocument();
        expect(screen.getByText(/Generate Roadmap/i)).toBeInTheDocument();
    });

    test("form submission triggers API call", async () => {
        getRoadmap.mockResolvedValue({ steps: ["Step1", "Step2"] });
        render(<MainApp />);
        fireEvent.change(screen.getByPlaceholderText(/Target Role/i), { target: { value: "Software Engineer" } });
        fireEvent.click(screen.getByText(/Generate Roadmap/i));

        await waitFor(() => expect(getRoadmap).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText(/Step1/i)).toBeInTheDocument());
    });

    test("shows error if target role empty", () => {
        render(<MainApp />);
        fireEvent.click(screen.getByText(/Generate Roadmap/i));
        expect(screen.getByText(/Please enter a target role/i)).toBeInTheDocument();
    });
});
