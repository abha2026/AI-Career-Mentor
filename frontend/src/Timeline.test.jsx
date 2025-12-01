import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import Timeline from "./Timeline";

describe("Timeline Component", () => {
    const mockItems = [
        { id: 1, title: "Step 1", description: ["Content 1a", "Content 1b"] },
        { id: 2, title: "Step 2", description: ["Content 2a", "Content 2b"] },
        { id: 3, title: "Step 3", description: ["Content 3a"] },
    ];

    test("renders all timeline steps", () => {
        render(<Timeline items={mockItems} />);
        mockItems.forEach(item => {
            expect(screen.getByText(item.title)).toBeInTheDocument();
        });
    });

    test("clicking a step toggles its description", () => {
        render(<Timeline items={mockItems} />);

        // Click Step 1 (left side)
        fireEvent.click(screen.getByText("Step 1"));
        expect(screen.getByText("Content 1a")).toBeInTheDocument();
        expect(screen.getByText("Content 1b")).toBeInTheDocument();

        // Click Step 1 again → should hide
        fireEvent.click(screen.getByText("Step 1"));
        expect(screen.queryByText("Content 1a")).not.toBeInTheDocument();
        expect(screen.queryByText("Content 1b")).not.toBeInTheDocument();
    });

    test("clicking the circle toggles the step description", () => {
        render(<Timeline items={mockItems} />);

        const circle = screen.getByText("2"); // circle with item.id
        fireEvent.click(circle);
        expect(screen.getByText("Content 2a")).toBeInTheDocument();
        expect(screen.getByText("Content 2b")).toBeInTheDocument();
    });

    test("only one step is open at a time", () => {
        render(<Timeline items={mockItems} />);

        // Open Step 1
        fireEvent.click(screen.getByText("Step 1"));
        expect(screen.getByText("Content 1a")).toBeInTheDocument();

        // Open Step 2
        fireEvent.click(screen.getByText("Step 2"));
        expect(screen.getByText("Content 2a")).toBeInTheDocument();
        // Step 1 should be closed
        expect(screen.queryByText("Content 1a")).not.toBeInTheDocument();
    });
});
