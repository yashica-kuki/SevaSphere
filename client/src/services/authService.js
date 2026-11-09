
const API_URL = "/api/auth";

const authRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Authentication request failed.");
  }

  return result;
};

export const loginUser = (data) =>
  authRequest("/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const registerUser = (data) =>
  authRequest("/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getCurrentUser = () =>
  authRequest("/me", {
    method: "GET",
  });

export const logoutUser = () =>
  authRequest("/logout", {
    method: "POST",
  });
