import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_request: NextRequest) {
  // Placeholder: आगे PRD के हिसाब से auth-protected routes लागू करेंगे।
  return NextResponse.next();
}

export const config = {
  // Placeholder matcher (अभी कुछ protect नहीं करेंगे)
  matcher: ["/dashboard", "/incidents/:path*", "/rota/:path*", "/handovers/:path*", "/analytics/:path*"],
};
