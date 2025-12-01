import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import '@testing-library/jest-dom';
import App from "./App";

window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
    useNavigate: () => jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("App Component", () => {
    let readerMock;
    let fetchMock;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();

        localStorage.setItem("userId", "123");

        readerMock = {
            read: jest
                .fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"resume":"mock resume"}\n\n') })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"gaps":"mock gaps"}\n\n') })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"courses":"mock courses"}\n\n') })
                .mockResolvedValueOnce({ done: true }),
        };

        fetchMock = jest.fn(() =>
            Promise.resolve({ body: { getReader: () => readerMock } })
        );
        global.fetch = fetchMock;

        global.WebSocket = class {
            constructor(url) {
                this.url = url;
                this.onopen = () => { };
                this.onmessage = () => { };
                this.onerror = () => { };
                this.onclose = () => { };
            }
            send() { }
            close() { }
        };
    });

    test("renders initial form inputs", () => {
        render(<App />);
        expect(screen.getByPlaceholderText("Target Role")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Company (optional)")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Location (optional)")).toBeInTheDocument();
        expect(screen.getByText(/Click to upload resume/i)).toBeInTheDocument();
        expect(screen.getByText(/Generate Roadmap/i)).toBeInTheDocument();
    });

    test("handles file upload", () => {
        render(<App />);
        const file = new File(["dummy content"], "resume.pdf", { type: "application/pdf" });
        const fileInput = screen.getByLabelText(/resume/i);
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(fileInput.files[0]).toBe(file);
        expect(fileInput.files).toHaveLength(1);
    });

    test("shows error if submit without file or targetRole", () => {
        render(<App />);
        fireEvent.click(screen.getByText(/Generate Roadmap/i));
        expect(screen.getByText(/Please upload a resume/i)).toBeInTheDocument();
    });

    test("form submission triggers loading and displays results", async () => {
        render(<App />);
        const file = new File(["dummy content"], "resume.pdf", { type: "application/pdf" });
        fireEvent.change(screen.getByLabelText(/Click to upload resume/i), { target: { files: [file] } });
        fireEvent.change(screen.getByPlaceholderText("Target Role"), { target: { value: "Software Engineer" } });

        fireEvent.click(screen.getByText(/Generate Roadmap/i));

        await waitFor(() => expect(screen.getByText(/Step 1: Extract Resume/i)).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText(/mock resume/i)).toBeInTheDocument());
        expect(screen.getByText(/mock gaps/i)).toBeInTheDocument();
        expect(screen.getByText(/mock courses/i)).toBeInTheDocument();
    });

    test("accordion toggles steps", async () => {
        render(<App />);
        const file = new File(["dummy content"], "resume.pdf", { type: "application/pdf" });
        fireEvent.change(screen.getByLabelText(/Click to upload resume/i), { target: { files: [file] } });
        fireEvent.change(screen.getByPlaceholderText("Target Role"), { target: { value: "Software Engineer" } });
        fireEvent.click(screen.getByText(/Generate Roadmap/i));

        const step1Header = await screen.findByText(/Step 1: Extract Resume/i);
        fireEvent.click(step1Header);
        expect(screen.getByText(/mock resume/i)).toBeInTheDocument();

        const step2Header = screen.getByText(/Step 2: Skill Gaps/i);
        fireEvent.click(step2Header);
        expect(screen.getByText(/mock gaps/i)).toBeInTheDocument();

        const step3Header = screen.getByText(/Step 3: Courses/i);
        fireEvent.click(step3Header);
        expect(screen.getByText(/mock courses/i)).toBeInTheDocument();
    });

    test("logout clears localStorage and navigates", () => {
        localStorage.setItem("token", "abc");
        localStorage.setItem("user", "abc");

        render(<App />);
        fireEvent.click(screen.getByText(/Logout/i));

        expect(localStorage.getItem("token")).toBeNull();
        expect(localStorage.getItem("user")).toBeNull();
        expect(localStorage.getItem("userId")).toBeNull();
    });

    test("handles fetch error gracefully", async () => {
        global.fetch = jest.fn(() => Promise.reject(new Error("Network Error")));
        render(<App />);
        fireEvent.change(screen.getByPlaceholderText("Target Role"), { target: { value: "Software Engineer" } });
        const file = new File(["dummy content"], "resume.pdf", { type: "application/pdf" });
        fireEvent.change(screen.getByLabelText(/resume/i), { target: { files: [file] } });

        fireEvent.click(screen.getByText(/Generate Roadmap/i));
        await waitFor(() => screen.getByText(/Failed to analyze resume/i));
    });

    test("stream roadmap updates timeline items correctly", async () => {
        let wsInstance;
        global.WebSocket = class {
            constructor(url) {
                wsInstance = this;
                setTimeout(() => this.onopen(), 0);
            }
            send = jest.fn();
            close = jest.fn();
        };

        render(<App />);
        const file = new File(["dummy content"], "resume.pdf", { type: "application/pdf" });
        fireEvent.change(screen.getByLabelText(/resume/i), { target: { files: [file] } });
        fireEvent.change(screen.getByPlaceholderText("Target Role"), { target: { value: "Software Engineer" } });

        fireEvent.click(screen.getByText(/Generate Roadmap/i));

        const streamBtn = await screen.findByRole("button", { name: /Stream Roadmap/i });
        fireEvent.click(streamBtn);

        act(() => {
            wsInstance.onmessage({ data: JSON.stringify({ token: "**Step A**\n* Task 1\n* Task 2" }) });
            wsInstance.onmessage({ data: JSON.stringify({ done: true }) });
        });

        await waitFor(() => screen.getByText(/Step A/i));
        expect(screen.getByText(/Task 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Task 2/i)).toBeInTheDocument();
    });

    test("parseRoadmapToTimeline works correctly", () => {
        const { parseRoadmapToTimeline } = render(<App />).type.prototype;
        const sample = "**Step 1**\n* Task A\n* Task B\n**Step 2**\n* Task C";
        const items = parseRoadmapToTimeline(sample);
        expect(items.length).toBe(2);
        expect(items[0].title).toBe("Step 1");
        expect(items[0].description).toEqual([" Task A", " Task B"]);
        expect(items[1].title).toBe("Step 2");
        expect(items[1].description).toEqual([" Task C"]);
    });

});
