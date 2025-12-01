import { loginUser, signupUser, getRoadmap } from "./api";

global.fetch = jest.fn();

describe("API module", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test("loginUser sends correct request", async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: "abc", userId: "123" }),
        });
        const res = await loginUser({ email: "test@test.com", password: "pass" });
        expect(res.token).toBe("abc");
        expect(fetch).toHaveBeenCalledWith("/api/login", expect.any(Object));
    });

    test("signupUser sends correct request", async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: "abc", userId: "123" }),
        });
        const res = await signupUser({ name: "Test", email: "a@b.com", password: "123" });
        expect(res.userId).toBe("123");
    });

    test("getRoadmap fetches roadmap", async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ steps: ["Step1"] }),
        });
        const res = await getRoadmap("role", "file.pdf");
        expect(res.steps).toContain("Step1");
    });
});
