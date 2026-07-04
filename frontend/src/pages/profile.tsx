import {
  BookOpen,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Presentation,
  University,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasProfileAccess } from "@/lib/auth";

const studentInfo = [
  { label: "Вуз", value: "МГУ" },
  { label: "Факультет", value: "Юридический" },
  { label: "Группа", value: "ЮР-231" },
  { label: "Зачетка", value: "23-1048" },
];

const interactions = [
  {
    title: "Сдан тест по истории России",
    description: "12 вопросов · результат отправлен преподавателю",
    time: "Сегодня, 12:40",
    icon: CheckCircle2,
    href: "/courses/history-of-russia/resources/history-05",
  },
  {
    title: "Открыта презентация по гражданскому праву",
    description: "Обязательственное право · 21 слайд",
    time: "Вчера, 18:10",
    icon: Presentation,
    href: "/courses/civil-law/resources/law-04",
  },
  {
    title: "Просмотрен PDF к семинару",
    description: "Задачи к семинару N4 · математический анализ",
    time: "2 июля, 09:25",
    icon: FileText,
    href: "/courses/mathematical-analysis/resources/math-03",
  },
  {
    title: "Открыта дисциплина «Академический английский»",
    description: "Добавлены материалы для чтения и тест по лексике",
    time: "1 июля, 16:45",
    icon: BookOpen,
    href: "/courses/academic-english",
  },
];

const informationItems = [
  { icon: Mail, label: "Почта", value: "a.viktorova@edu.example" },
  { icon: MapPin, label: "Кампус", value: "Ленинские горы" },
  { icon: University, label: "Корпус", value: "Шуваловский" },
  { icon: BookOpen, label: "Активность", value: "5 дисциплин" },
];

export default function ProfilePage() {
  if (!hasProfileAccess()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="space-y-6" aria-labelledby="profile-title">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-16">
              <AvatarFallback className="text-lg font-semibold">АВ</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Студент</Badge>
                <Badge variant="outline">3 курс</Badge>
              </div>
              <h1 id="profile-title" className="mt-2 text-2xl font-semibold">
                Анна Викторова
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Юридический факультет · группа ЮР-231
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm">
            <Pencil />
            Редактировать
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {studentInfo.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-sm font-medium">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section
          className="rounded-xl border bg-card"
          aria-labelledby="interaction-history-title"
        >
          <div className="border-b p-5">
            <h2 id="interaction-history-title" className="text-lg font-semibold">
              История взаимодействий
            </h2>
          </div>

          <div className="divide-y">
            {interactions.map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="flex gap-4 p-5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <item.icon className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-medium">{item.title}</h3>
                    <span className="text-sm text-muted-foreground">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Информация</h2>
          <div className="mt-4 grid gap-4">
            {informationItems.map((item) => (
              <div key={item.label} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <item.icon className="size-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm font-medium">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
