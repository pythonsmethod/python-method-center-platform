"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AppRouteMode() {
  const pathname = usePathname();

  useEffect(() => {
    const active = pathname.startsWith("/app-preview");
    document.body.classList.toggle("native-app-route", active);
    return () => document.body.classList.remove("native-app-route");
  }, [pathname]);

  return null;
}
