import {
  ArrowLeft,
  BookOpen,
  FileText,
  GraduationCap,
  Mail,
  Presentation,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type CourseResource,
  type CourseResourceType,
  findCourseById,
} from "@/lib/courses-data";
import { cn } from "@/lib/utils";

const resourceTypeMeta: Record<
  CourseResourceType,
  {
    label: string;
    icon: typeof BookOpen;
  }
> = {
  lecture: { label: "Лекция", icon: GraduationCap },
  pdf: { label: "PDF", icon: FileText },
  text: { label: "Текст", icon: FileText },
  presentation: { label: "Презентация", icon: Presentation },
  test: { label: "Тест", icon: BookOpen },
};

function CourseResourceItem({
  courseId,
  resource,
}: {
  courseId: string;
  resource: CourseResource;
}) {
  const meta = resourceTypeMeta[resource.type];
  const Icon = meta.icon;

  return (
    <Link
      to={`/courses/${courseId}/resources/${resource.id}`}
      className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">{resource.title}</h2>
          <Badge variant="outline">{meta.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {resource.description}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {resource.duration}
        </p>
      </div>
    </Link>
  );
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const course = findCourseById(courseId);

  if (!course) {
    return (
      <section className="space-y-4" aria-labelledby="course-not-found-title">
        <Button asChild variant="outline">
          <Link to="/courses">
            <ArrowLeft />
            К курсам
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle id="course-not-found-title">Курс не найден</CardTitle>
            <CardDescription>
              Возможно, курс был удален или ссылка устарела.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="course-title">
      <Button asChild variant="outline">
        <Link to="/courses">
          <ArrowLeft />
          К курсам
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle id="course-title" className="text-2xl">
              {course.title}
            </CardTitle>
            <CardDescription>{course.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
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
              <span className="inline-flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                {course.lessons} занятий
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Преподаватель</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarFallback>{course.teacher.initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  {course.teacher.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {course.teacher.role}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4 text-primary" />
              {course.teacher.email}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Материалы дисциплины</CardTitle>
          <CardDescription>
            Открывайте лекции, тесты, PDF и презентации прямо в сервисе
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {course.resources.map((resource) => (
            <CourseResourceItem
              key={resource.id}
              courseId={course.id}
              resource={resource}
            />
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
