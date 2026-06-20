import axios from "axios";
import { useAuth } from "../stores/auth";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL_API || "http://localhost:8000",
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token =
    useAuth.getState().token ??
    (typeof window !== "undefined" ? window.localStorage.getItem("pos.token") : null);

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/logout")) {
      useAuth.getState().logout();
    }

    return Promise.reject(error);
  },
);
