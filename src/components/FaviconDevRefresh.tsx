"use client";
import { useEffect } from "react";

export default function FaviconDevRefresh() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (link) {
        link.href = "/favicon.ico?v=" + Date.now();
      }
    }
  }, []);
  return null;
} 