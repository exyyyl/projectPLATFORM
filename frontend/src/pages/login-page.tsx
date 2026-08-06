import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, LogIn, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().min(1, "Введите почту").email("Некорректный адрес почты"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // после успешного login() статус станет authenticated и GuestRoute сам
  // уведёт со страницы входа — навигация здесь не нужна
  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 401
          ? "Неверная почта или пароль"
          : error instanceof Error
            ? error.message
            : "Не удалось войти, попробуйте ещё раз",
      );
    }
  };

  return (
    <section className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <LogIn className="size-5 text-primary" />
            <h1>Авторизация</h1>
          </CardTitle>
          <CardDescription>
            Войдите, чтобы получить доступ к платформе.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Электронная почта
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="pl-9"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Пароль
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Введите пароль"
                  className="pl-9"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />}
              {isSubmitting ? "Входим..." : "Войти"}
            </Button>
            <Link
              className="text-center text-sm text-primary hover:underline"
              to="/login"
            >
              Забыл пароль
            </Link>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
