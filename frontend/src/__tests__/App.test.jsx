import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../App";

test("renders header and upload button", () => {
    render(<App />);
    expect(screen.getByText(/AI Career Mentor/i)).toBeInTheDocument();
    expect(screen.getByText(/Click to upload resume/i)).toBeInTheDocument();
});

test("shows error if submit without file", async () => {
    render(<App />);
    const btn = screen.getByText(/Generate Roadmap/i);
    fireEvent.click(btn);
    expect(await screen.findByText(/Please upload a resume/i)).toBeInTheDocument();
});
