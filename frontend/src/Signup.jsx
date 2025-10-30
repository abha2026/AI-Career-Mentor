import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { signupUser } from "./api";

export default function Signup() {
    const [email, setEmail] = useState("");
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        if (!email || !userId || !password) return alert("Fill all fields");
        try {
            await signupUser(email, userId, password);
            alert("Signup successful! Please log in.");
            navigate("/login");
        } catch (err) {
            alert(err.response?.data?.detail || "Signup failed");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
            <header className="relative p-6 text-center bg-gradient-to-r from-indigo-800 via-purple-800 to-pink-700 rounded-b-3xl shadow-lg overflow-hidden">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(135deg, #ffffff 0%, #d8b4fe 85%)" }}>
                    AI Career Mentor
                </h1>
                <p className="text-gray-300 mt-2 max-w-xl mx-auto">
                    Create your account to start building your personalized career roadmap
                </p>
            </header>

            <main className="flex flex-1 items-center justify-center px-6 py-12">
                <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-center text-indigo-400 mb-6">Get Started</h2>

                    <form onSubmit={handleSignup} className="space-y-5">
                        <input
                            type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-100"
                        />
                        <input
                            type="text" placeholder="User ID" value={userId} onChange={e => setUserId(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-100"
                        />
                        <input
                            type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-100"
                        />
                        <button type="submit" className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 transition py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                            <UserPlus className="w-5 h-5" /> Sign Up
                        </button>
                    </form>

                    <p className="mt-6 text-sm text-center text-gray-400">
                        Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Log in</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
