import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Signup from "./Signup";
import App from "./App.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

export default function MainApp() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />


            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <App />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
