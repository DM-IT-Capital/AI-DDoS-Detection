import React from "react";
import { getRole } from "../utils/auth";

export default function RoleGate({ allowed, children }) {
  const role = getRole();
  return allowed.includes(role) ? children : null;
}
