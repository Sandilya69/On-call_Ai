import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  // Auth pages के लिए अलग layout (PRD: login में sidebar/header नहीं होता)
  return children;
}
