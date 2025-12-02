import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import '@testing-library/jest-dom';
import { MemoryRouter } from "react-router-dom";
import MainApp from "./MainApp";


jest.mock("./ProtectedRoute.jsx", () => ({ children }) => <>{children}</>);


jest.mock("./App.jsx", () => () => <div>Dashboard App</div>);


jest.mock("./Home", () => () => <div>Home Page</div>);
jest.mock("./Login", () => () => <div>Login Page</div>);
jest.mock("./Signup", () => () => <div>Signup Page</div>);

describe("MainApp Component", () => {

    test("renders Home route by default", () => {
        render(
            <MemoryRouter initialEntries={["/"]}>
                <MainApp />
            </MemoryRouter>
        );

        expect(screen.getByText("Home Page")).toBeInTheDocument();
    });

    test("renders Login route", () => {
        render(
            <MemoryRouter initialEntries={["/login"]}>
                <MainApp />
            </MemoryRouter>
        );

        expect(screen.getByText("Login Page")).toBeInTheDocument();
    });

    test("renders Signup route", () => {
        render(
            <MemoryRouter initialEntries={["/signup"]}>
                <MainApp />
            </MemoryRouter>
        );

        expect(screen.getByText("Signup Page")).toBeInTheDocument();
    });

    test("renders Dashboard route with ProtectedRoute", () => {
        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <MainApp />
            </MemoryRouter>
        );

        expect(screen.getByText("Dashboard App")).toBeInTheDocument();
    });
});
