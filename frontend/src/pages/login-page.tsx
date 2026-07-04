import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LogIn, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
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
import { grantProfileAccess } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = () => {
    grantProfileAccess();
    navigate("/profile");
  };

  return (
    <section className="mx-auto flex max-w-md flex-col justify-center py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <LogIn className="size-5 text-primary" />
            Авторизация
          </CardTitle>
          <CardDescription>
            Нажмите «Войти», чтобы открыть интерфейс профиля.
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
                  {...register("email")}
                />
              </div>
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
                  {...register("password")}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Button type="submit" className="w-full">
              <LogIn />
              Войти
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
