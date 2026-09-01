import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

export const ORIGIN_URL = window.location.origin + (process.env.REACT_APP_BASENAME || "");

// Send Authorization header from localStorage token as fallback for iframes/preview
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ab_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || "Erro inesperado";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
  if (typeof detail === "object" && detail.msg) return detail.msg;
  return String(detail);
}

export default api;
