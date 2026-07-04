import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogIn, LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { apiFetch } from "@/lib/api";
import { hasProfileAccess, revokeProfileAccess } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const links = [
  { to: "/", label: "Главная" },
  { to: "/courses", label: "Курсы" },
  { to: "/news", label: "Новости" },
];

type HealthResponse = { status: string; timestamp: string };

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const isAuthenticated = hasProfileAccess();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/health"),
  });

  const handleLogout = () => {
    revokeProfileAccess();
    setIsProfileMenuOpen(false);
    if (location.pathname === "/profile") {
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <nav
          className="flex w-full items-center gap-1 overflow-x-auto sm:w-auto"
          aria-label="Основная навигация"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  buttonVariants({
                    variant: isActive ? "default" : "ghost",
                    size: "default",
                  }),
                  isActive && "bg-primary hover:bg-primary/70",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span
            className="hidden text-xs text-muted-foreground sm:inline"
            aria-live="polite"
          >
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
          <div className="relative">
            <button
              type="button"
              className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Открыть меню профиля"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsProfileMenuOpen((value) => !value)}
            >
              <Avatar>
                <AvatarImage
                  src="https://avatars.githubusercontent.com/u/79035965?v=4"
                  alt="Аватар пользователя"
                />
                <AvatarFallback>AV</AvatarFallback>
              </Avatar>
            </button>

            {isProfileMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border bg-card p-2 text-card-foreground shadow"
                role="menu"
              >
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <Link to="/profile">
                    <User />
                    Профиль
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <Link to="/login">
                    <LogIn />
                    Войти
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  disabled={!isAuthenticated}
                  onClick={handleLogout}
                >
                  <LogOut />
                  Выйти
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
