import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button-variants";

const links = [
  { to: "/", label: "Главная" },
  { to: "/courses", label: "Курсы" },
  { to: "/news", label: "Новости" },
];

type HealthResponse = { status: string; timestamp: string };

export function Header() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/health"),
  });

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  isActive && "bg-accent text-accent-foreground",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            API:{" "}
            {health.isLoading ? (
              "проверка..."
            ) : health.isError ? (
              <span className="text-destructive">недоступен</span>
            ) : (
              <span className="text-success">{health.data?.status}</span>
            )}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
