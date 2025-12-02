// src/api.js
import axios from "axios";

const API_BASE = "http://localhost:8000";

export const signupUser = (email, userId, password) => {

    const formData = new FormData();
    formData.append("email", email);
    formData.append("user_id", userId);
    formData.append("password", password);

    return axios.post(`${API_BASE}/signup/`, formData);
};

export const loginUser = (userId, password) => {
    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("password", password);

    return axios.post(`${API_BASE}/login/`, formData);
};
