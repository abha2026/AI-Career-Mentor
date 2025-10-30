import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn } from "lucide-react";
import { loginUser } from "./api";

export default function Login() {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!userId || !password) return alert("Fill all fields");
        try {
            const res = await loginUser(userId, password);
            if (res.status === 200) {
                localStorage.setItem("userId", userId);
                navigate("/dashboard");
            }
        } catch (err) {
            alert(err.response?.data?.detail || "Login failed");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
            <header className="relative p-6 text-center bg-gradient-to-r from-indigo-800 via-purple-800 to-pink-700 rounded-b-3xl shadow-lg overflow-hidden">
                <h1
                    className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(135deg, #ffffff 0%, #d8b4fe 85%)" }}
                >
                    AI Career Mentor
                </h1>
                <p className="text-gray-300 mt-2 max-w-xl mx-auto">
                    Log in to access your personalized career roadmap
                </p>
            </header>

            <main className="flex flex-1 items-center justify-center px-6 py-12">
                <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-center text-indigo-400 mb-6">Welcome Back</h2>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <input
                            type="text"
                            placeholder="User ID"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-100"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-100"
                        />
                        <button
                            type="submit"
                            className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 transition py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-5 h-5" /> Log In
                        </button>
                    </form>

                    <p className="mt-6 text-sm text-center text-gray-400">
                        Don’t have an account?{" "}
                        <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
                            Sign up
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
