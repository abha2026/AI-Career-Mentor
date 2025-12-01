// __tests__/Home.test.jsx
import { render, screen } from "@testing-library/react";
import Home from "./Home";
import { MemoryRouter } from "react-router-dom";

test("renders Home page with title", () => {
    render(
        <MemoryRouter>
            <Home />
        </MemoryRouter>
    );

    expect(screen.getByText(/AI Career Mentor/i)).toBeInTheDocument();
});
