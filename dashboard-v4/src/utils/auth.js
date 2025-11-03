export const getToken = () => localStorage.getItem("token");
export const getRole = () => localStorage.getItem("role");

export const saveAuth = (token, role) => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

export const isAuthenticated = () => !!getToken();
