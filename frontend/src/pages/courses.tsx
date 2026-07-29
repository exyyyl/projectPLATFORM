import { BookOpen, Layers3, Search } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { courses } from "@/lib/courses-data";
import { cn } from "@/lib/utils";

export default function CoursePage() {
  return (
    <section className="space-y-5" aria-label="Курсы">
      <div className="flex justify-end">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Найти курс"
            className="pl-9"
            aria-label="Найти курс"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Link
            key={course.id}
            to={`/courses/${course.id}`}
            className="block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Card className="flex h-full flex-col overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
              <div
                className={cn(
                  "flex min-h-40 shrink-0 flex-col justify-between border-b p-5",
                  course.headerClassName,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-card/80 text-primary shadow-sm">
                    <Layers3 className="size-5" />
                  </div>
                </div>
                <CardTitle className="max-w-sm text-xl leading-tight">
                  {course.title}
                </CardTitle>
              </div>
              <CardContent className="flex flex-1 flex-col gap-4 p-6">
                <CardDescription>{course.description}</CardDescription>

                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Прогресс</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary",
                        course.progressClassName,
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    {course.lessons} занятий
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
