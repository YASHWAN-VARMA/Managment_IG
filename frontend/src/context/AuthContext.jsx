
import { createContext, useContext, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mg_user") || "null");
    } catch {
      return null;
    }
  });

  const [loading] = useState(false);

  async function login(email, password) {
    const data = await api.post(
      "/login",
      { email, password },
      { auth: false }
    );

    const token = data.accessToken || data.token;

    if (!token) {
      throw new Error("Access token missing from login response.");
    }

    localStorage.setItem("mg_access_token", token);

    const profile = data.user || {
      email,
      name: email.split("@")[0],
      role: "User",
    };

    localStorage.setItem("mg_user", JSON.stringify(profile));
    setUser(profile);

    return profile;
  }

  function logout() {
    api.post("/logout", {}).catch(() => {});
    localStorage.removeItem("mg_access_token");
    localStorage.removeItem("mg_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
