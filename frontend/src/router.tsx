import { createBrowserRouter } from "react-router-dom";

import { RootLayout } from "@/components/layout/root-layout";
import { DashboardPage } from "@/pages/dashboard";
import { NotFoundPage } from "@/pages/not-found";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "*", element: <NotFoundPage /> },
      {
        path: "courses",
        lazy: async () => {
          const { default: Component } = await import("@/pages/courses");
          return { Component };
        },
      },
      {
        path: "news",
        lazy: async () => {
          const { default: Component } = await import("@/pages/news");
          return { Component };
        },
      },
      {
        path: "login",
        lazy: async () => {
          const { default: Component } = await import("@/pages/loginPage");
          return { Component };
        },
      },
    ],
  },
]);
