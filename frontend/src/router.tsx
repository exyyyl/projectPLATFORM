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
        path: "courses/:courseId",
        lazy: async () => {
          const { default: Component } = await import("@/pages/course-detail");
          return { Component };
        },
      },
      {
        path: "courses/:courseId/resources/:resourceId",
        lazy: async () => {
          const { default: Component } = await import("@/pages/course-resource");
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
          const { default: Component } = await import("@/pages/login-page");
          return { Component };
        },
      },
      {
        path: "profile",
        lazy: async () => {
          const { default: Component } = await import("@/pages/profile");
          return { Component };
        },
      },
    ],
  },
]);
