import axios from "axios";
import Cookies from "js-cookie";

// Base URL for the chatbot API, per the provided spec.
export const API_BASE_URL = "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the auth token (from cookies) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = Cookies.get("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token is rejected, clear cookies so the app returns to a logged-out state.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      Cookies.remove("auth_token");
      Cookies.remove("user");
      Cookies.remove("conversation");
      Cookies.remove("messages");
    }
    return Promise.reject(error);
  }
);

export default api;
