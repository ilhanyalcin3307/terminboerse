import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const missingFilters = ["search", "category", "district"].map((key) => ({ type: "query" as const, key }));
    return {
      beforeFiles: [
        {
          source: "/arzt",
          has: [{ type: "query", key: "page", value: "(?<page>[1-9][0-9]{0,3})" }],
          missing: missingFilters,
          destination: "/directory-isr/arzt/:page",
        },
        {
          source: "/arzt",
          missing: [...missingFilters, { type: "query", key: "page" }],
          destination: "/directory-isr/arzt/1",
        },
        {
          source: "/arzttermin-wien/:specialty",
          has: [{ type: "query", key: "page", value: "(?<page>[1-9][0-9]{0,3})" }],
          missing: missingFilters,
          destination: "/directory-isr/:specialty/:page",
        },
        {
          source: "/arzttermin-wien/:specialty",
          missing: [...missingFilters, { type: "query", key: "page" }],
          destination: "/directory-isr/:specialty/1",
        },
      ],
    };
  },
};

export default nextConfig;
