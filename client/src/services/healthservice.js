import api from "./api";

export const getServerHealth = () => api.get("/health");