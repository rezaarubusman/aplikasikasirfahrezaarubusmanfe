import axios from "axios";
import { useAuth } from "../stores/auth";


let isRefreshing = false;

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL_API || "http://localhost:8000",
  withCredentials: true,
});

export const refreshInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL_API || "http://localhost:8000",
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuth.getState().user?.token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/logout")
    ) {
      // Jika tidak ada user di state, langsung lempar ke login tanpa refresh
      // Namun, kita hanya redirect jika user sebelumnya "pernah" login (ada di state)
      // Jika user memang guest, biarkan komponen yang menangani errornya
      const isAuthenticated = !!useAuth.getState().user;
      if (!isAuthenticated) {
        return Promise.reject(error);
      }

      if (isRefreshing) return Promise.reject(error);

      try {
        isRefreshing = true;
        originalRequest._retry = true;

        const refreshResponse = await refreshInstance.post("/auth/refresh");
        const refreshedUser = refreshResponse.data?.data;

        if (refreshedUser?.token) {
          useAuth.getState().login(refreshedUser);
          originalRequest.headers.Authorization = `Bearer ${refreshedUser.token}`;
        }

        isRefreshing = false;
        return axiosInstance(originalRequest);
      } catch (error) {
        useAuth.getState().logout();
        // Redirect to login page after a failed refresh and logout
        // This ensures the application state is fully reset and prevents further authenticated requests.
        // Adjust '/login' to your actual login route.
        window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
