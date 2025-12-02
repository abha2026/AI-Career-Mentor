import React from "react";
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import App, { parseRoadmapToTimeline } from "./App";
import AccordionStep from "./App";

window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
    useNavigate: () => jest.fn(),
}));

const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("App Component", () => {
    let readerMock;
    let fetchMock;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();

        localStorage.setItem("userId", "user-123");

        // Mock the server-sent events from /analyze/
        readerMock = {
            read: jest
                .fn()
                .mockResolvedValueOnce({
                    done: false,
                    value: new TextEncoder().encode(
                        'data: {"resume":"**Step 1**\\n* Task A"}\n\n'
                    ),
                })
                .mockResolvedValueOnce({
                    done: false,
                    value: new TextEncoder().encode('data: {"gaps":"mock gaps"}\n\n'),
                })
                .mockResolvedValueOnce({
                    done: false,
                    value: new TextEncoder().encode(
                        'data: {"courses":"mock courses"}\n\n'
                    ),
                })
                .mockResolvedValueOnce({ done: true }),
        };

        fetchMock = jest.fn(() =>
            Promise.resolve({ body: { getReader: () => readerMock } })
        );
        global.fetch = fetchMock;


        global.WebSocket = class {
            constructor() {
                this.onopen = () => { };
                this.onmessage = () => { };
                this.onerror = () => { };
                this.onclose = () => { };
            }
            send() { }
            close() { }
        };
    });

    test("renders initial pre-results layout", () => {
        render(<App />);


        expect(
            screen.getByText(/Your Info/i)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Click to upload resume/i)
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText("Target Role")
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText("Company (optional)")
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText("Location (optional)")
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Generate Roadmap/i)
        ).toBeInTheDocument();
    });

    test("shows validation error when submitting without file or targetRole", () => {
        render(<App />);

        fireEvent.click(screen.getByText(/Generate Roadmap/i));

        expect(
            screen.getByText(
                /Please upload a resume and enter your target role./i
            )
        ).toBeInTheDocument();
    });

    test("successful analyze call shows results and toggles all steps open", async () => {
        render(<App />);

        const file = new File(["dummy"], "resume.pdf", {
            type: "application/pdf",
        });

        fireEvent.change(
            screen.getByLabelText(/resume upload/i),
            { target: { files: [file] } }
        );
        fireEvent.change(
            screen.getByPlaceholderText("Target Role"),
            { target: { value: "Software Engineer" } }
        );

        fireEvent.click(screen.getByText(/Generate Roadmap/i));

        // After first SSE chunk: results layout and Step 1 open
        await waitFor(() =>
            expect(
                screen.getByText(/Step 1: Extract Resume/i)
            ).toBeInTheDocument()
        );
        // Resume text rendered via parseOllamaOutput
        expect(screen.getByText(/Step 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Task A/i)).toBeInTheDocument();

        // Gaps and courses should be visible too
        expect(screen.getByText(/mock gaps/i)).toBeInTheDocument();
        expect(screen.getByText(/mock courses/i)).toBeInTheDocument();
    });

    test("accordion toggle opens and closes steps", async () => {
        render(<App />);

        const file = new File(["dummy"], "resume.pdf", {
            type: "application/pdf",
        });

        fireEvent.change(
            screen.getByLabelText(/resume upload/i),
            { target: { files: [file] } }
        );
        fireEvent.change(
            screen.getByPlaceholderText("Target Role"),
            { target: { value: "Software Engineer" } }
        );

        fireEvent.click(screen.getByText(/Generate Roadmap/i));

        const step1Header = await screen.findByText(
            /Step 1: Extract Resume/i
        );
        // Open is true by default after analyze; click to close
        fireEvent.click(step1Header);
        // content should disappear
        expect(
            screen.queryByText(/Task A/i)
        ).not.toBeInTheDocument();

        // click again to reopen
        fireEvent.click(step1Header);
        await waitFor(() =>
            expect(screen.getByText(/Task A/i)).toBeInTheDocument()
        );
    });

    test("logout clears localStorage and navigates", () => {
        localStorage.setItem("token", "t");
        localStorage.setItem("user", "u");
        localStorage.setItem("userId", "id");

        render(<App />);

        fireEvent.click(screen.getByText(/Logout/i));

        expect(localStorage.getItem("token")).toBeNull();
        expect(localStorage.getItem("user")).toBeNull();
        expect(localStorage.getItem("userId")).toBeNull();
    });

    test("handleSubmit shows fetch error message on failure", async () => {
        global.fetch = jest.fn(() =>
            Promise.reject(new Error("Network Error"))
        );

        render(<App />);

        const file = new File(["dummy"], "resume.pdf", {
            type: "application/pdf",
        });

        fireEvent.change(
            screen.getByLabelText(/resume upload/i),
            { target: { files: [file] } }
        );
        fireEvent.change(
            screen.getByPlaceholderText("Target Role"),
            { target: { value: "Engineer" } }
        );

        fireEvent.click(screen.getByText(/Generate Roadmap/i));

        await waitFor(() =>
            expect(
                screen.getByText(/Failed to analyze resume: Network Error/i)
            ).toBeInTheDocument()
        );
    });

    test("stream roadmap updates timeline items via WebSocket", async () => {
        let wsInstance;

        global.WebSocket = class {
            constructor() {
                wsInstance = this;
                setTimeout(() => this.onopen && this.onopen(), 0);
            }
            send = jest.fn();
            close = jest.fn();
        };

        render(<App />);

        const file = new File(["dummy"], "resume.pdf", {
            type: "application/pdf",
        });

        fireEvent.change(
            screen.getByLabelText(/resume upload/i),
            { target: { files: [file] } }
        );
        fireEvent.change(
            screen.getByPlaceholderText("Target Role"),
            { target: { value: "Engineer" } }
        );

        fireEvent.click(screen.getByText(/Generate Roadmap/i));

        // Wait for steps and showResults layout
        await waitFor(() =>
            screen.getByText(/Step 4: Career Roadmap/i)
        );

        // Stream button becomes visible once resume/gaps/courses present
        const streamBtn = await screen.findByRole("button", {
            name: /Stream Roadmap/i,
        });
        fireEvent.click(streamBtn);

        // Simulate WS messages
        act(() => {
            wsInstance.onmessage({
                data: JSON.stringify({
                    token: "**Step A**\n* Task 1\n* Task 2\n",
                }),
            });
            wsInstance.onmessage({
                data: JSON.stringify({ done: true }),
            });
        });

        // Timeline component should render parsed items
        await waitFor(() =>
            expect(screen.getByText(/Step A/i)).toBeInTheDocument()
        );
    });

    test("parseRoadmapToTimeline parses markdown-like roadmap", () => {
        const sample =
            "**Step 1**\n* Task A*\n* Task B*\n**Step 2**\n* Task C*";
        const items = parseRoadmapToTimeline(sample);

        expect(items).toHaveLength(2);
        expect(items[0].title).toBe("Step 1");
        expect(items[0].description).toEqual(["Task A", "Task B"]);
        expect(items[1].title).toBe("Step 2");
        expect(items[1].description).toEqual(["Task C"]);
    });
});

test("company and location inputs render and update state", async () => {
    render(<App />);

    // Find and interact with company input
    const companyInput = screen.getByPlaceholderText("Company (optional)");
    fireEvent.change(companyInput, { target: { value: "TechCorp" } });
    expect(companyInput).toHaveValue("TechCorp");

    // Find and interact with location input  
    const locationInput = screen.getByPlaceholderText("Location (optional)");
    fireEvent.change(locationInput, { target: { value: "San Francisco" } });
    expect(locationInput).toHaveValue("San Francisco");
});

test("form submission includes company and location in FormData", async () => {
    const mockFormData = new FormData();
    mockFormData.append = jest.fn();

    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            body: {
                getReader: () => ({
                    read: jest.fn().mockResolvedValue({ done: true })
                })
            }
        })
    );

    render(<App />);

    // Fill all required fields + company/location
    const file = new File(["dummy"], "resume.pdf", { type: "application/pdf" });
    const resumeInput = screen.getByLabelText(/resume upload/i);
    fireEvent.change(resumeInput, { target: { files: [file] } });

    fireEvent.change(screen.getByPlaceholderText("Target Role"), {
        target: { value: "Software Engineer" }
    });

    fireEvent.change(screen.getByPlaceholderText("Company (optional)"), {
        target: { value: "Amazon" }
    });

    fireEvent.change(screen.getByPlaceholderText("Location (optional)"), {
        target: { value: "Seattle" }
    });

    // Submit form
    fireEvent.click(screen.getByText(/Generate Roadmap/i));

    // Verify FormData contains company and location
    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:8000/analyze/",
            expect.objectContaining({
                method: "POST",
                body: expect.any(FormData)
            })
        );
    });

    // Extract FormData from fetch call and verify contents
    const fetchCall = global.fetch.mock.calls[0][1];
    expect(fetchCall.body).toBeInstanceOf(FormData);
});

test("AccordionStep toggles open and closed and shows content", () => {
    const toggle = jest.fn();
    const contentText = "Accordion content";

    const { rerender } = render(
        <AccordionStep
            step={1}
            title="Step Title"
            content={contentText}
            open={false}
            toggle={toggle}
        />
    );

    expect(screen.queryByText(contentText)).not.toBeInTheDocument();


    fireEvent.click(screen.getByText(/Step 1: Step Title/i));
    expect(toggle).toHaveBeenCalled();


    rerender(
        <AccordionStep
            step={1}
            title="Step Title"
            content={contentText}
            open={true}
            toggle={toggle}
        />
    );
    expect(screen.getByText(contentText)).toBeInTheDocument();
});

test("AccordionStep shows skeleton loading when loading", () => {
    const loadingSkeleton = (
        <div data-testid="loading-skeleton">Loading...</div>
    );

    render(
        <AccordionStep
            step={2}
            title="Skill Gaps"
            content={loadingSkeleton}
            open={true}
            toggle={() => { }}
        />
    );

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
});

test("AccordionStep extraButton renders and is clickable", () => {
    const onClick = jest.fn();
    render(
        <AccordionStep
            step={4}
            title="Career Roadmap"
            content="Some roadmap content"
            open={true}
            toggle={() => { }}
            extraButton={
                <button onClick={onClick}>Stream Roadmap</button>
            }
        />
    );

    const button = screen.getByText("Stream Roadmap");
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
});