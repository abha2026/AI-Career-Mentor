import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
            {/* Header */}
            <header className="relative p-6 text-center bg-gradient-to-r from-indigo-800 via-purple-800 to-pink-700 rounded-b-3xl shadow-lg overflow-hidden">
                <h1
                    className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(135deg, #ffffff 0%, #d8b4fe 85%)" }}
                >
                    AI Career Mentor
                </h1>

                {/* Decorative shapes */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
                    <div className="w-24 h-6 bg-indigo-400 rounded-full opacity-30 animate-pulse"></div>
                    <div className="w-16 h-4 bg-pink-400 rounded-full opacity-20 animate-pulse delay-100"></div>
                    <div className="w-20 h-5 bg-purple-400 rounded-full opacity-25 animate-pulse delay-200"></div>
                </div>
            </header>


            <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
                <p className="text-gray-400 max-w-2xl text-center text-lg md:text-xl">
                    Explore your personalized roadmap, uncover skill gaps, and get tailored career guidance.
                </p>

                <div className="mt-8 flex gap-4 flex-wrap justify-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 font-medium text-white shadow hover:bg-indigo-700 active:bg-indigo-800 transition"
                    >
                        Sign In
                    </Link>

                    <Link
                        to="/signup"
                        className="inline-flex items-center justify-center rounded-2xl border border-indigo-600 px-6 py-3 font-medium text-indigo-400 hover:bg-indigo-700 hover:text-white active:bg-indigo-800 transition"
                    >
                        Sign Up
                    </Link>
                </div>

                {/* Feature badges */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-sm">
                        Résumé-aware suggestions
                    </span>
                    <span className="rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-sm">
                        AI-guided skill analysis
                    </span>
                    <span className="rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-sm">
                        Personalized roadmap
                    </span>
                </div>
            </main>
        </div>
    );
}
