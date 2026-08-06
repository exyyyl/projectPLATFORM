import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  GraduationCap,
  Presentation,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

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
  type CourseResourceType,
  findCourseResource,
} from "@/lib/courses-data";

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

function PresentationView() {
  return (
    <div className="grid gap-4 @3xl:grid-cols-3">
      {["Тема занятия", "Ключевые понятия", "Вопросы для семинара"].map(
        (title, index) => (
          <div key={title} className="rounded-xl border bg-card p-4">
            <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-2xl font-bold text-primary">
              {index + 1}
            </div>
            <div className="mt-3 font-semibold">{title}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Слайд доступен для просмотра в сервисе.
            </p>
          </div>
        ),
      )}
    </div>
  );
}

function TestView() {
  const questions = [
    "Выберите корректное определение ключевого понятия темы.",
    "Какой пример лучше всего иллюстрирует материал лекции?",
    "Какие выводы можно сделать из предложенного источника?",
    "Какой источник стоит использовать для аргументации ответа?",
    "Что нужно повторить перед следующим семинаром?",
    "Какой термин относится к основной теме занятия?",
    "Какой тезис лучше всего раскрывает позицию автора?",
    "Что является главным результатом рассмотренного процесса?",
    "Какой пример можно использовать в письменном ответе?",
    "Какой фрагмент материала требует дополнительной проверки?",
    "Что следует указать в качестве первого аргумента?",
    "Какой вариант ответа содержит фактическую ошибку?",
    "Какой метод анализа подходит для этой темы?",
    "Какой вывод соответствует материалам презентации?",
    "Что нужно включить в краткий конспект занятия?",
    "Какое утверждение подтверждается учебным источником?",
    "Какой пример преподаватель разобрал на лекции?",
    "Что относится к обязательной части домашней подготовки?",
    "Какой пункт лучше вынести в ответ на семинаре?",
    "Какой термин нужно повторить перед контрольной работой?",
    "Какой источник является дополнительным, а не основным?",
    "Что показывает сравнительная таблица из материала?",
    "Какой ответ наиболее полно раскрывает вопрос?",
    "Какой элемент темы связан с предыдущей лекцией?",
    "Что следует отметить как итог изучения раздела?",
  ];
  const answers = ["Вариант A", "Вариант B", "Вариант C"];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(
    {},
  );

  const currentQuestion = questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(selectedAnswers).length;

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((index) => Math.max(index - 1, 0));
  };

  const goToNextQuestion = () => {
    setCurrentQuestionIndex((index) =>
      Math.min(index + 1, questions.length - 1),
    );
  };

  const handleAnswerChange = (answer: string) => {
    setSelectedAnswers((current) => ({
      ...current,
      [currentQuestionIndex]: answer,
    }));
  };

  return (
    <div className="grid gap-6 @5xl:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Badge variant="secondary">
              Вопрос {currentQuestionIndex + 1} из {questions.length}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Отвечено: {answeredCount}/{questions.length}
            </span>
          </div>

          <fieldset className="mt-5">
            <legend className="text-xl font-semibold">{currentQuestion}</legend>
            <div className="mt-4 grid gap-3">
              {answers.map((answer) => (
                <label
                  key={answer}
                  className="flex items-center gap-3 rounded-xl bg-muted p-4 text-sm transition-colors hover:bg-accent"
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    className="size-4"
                    checked={selectedAnswers[currentQuestionIndex] === answer}
                    onChange={() => handleAnswerChange(answer)}
                  />
                  {answer}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            disabled={isFirstQuestion}
            onClick={goToPreviousQuestion}
          >
            <ChevronLeft />
            Назад
          </Button>
          {isLastQuestion ? (
            <Button>
              <CheckCircle2 />
              Завершить тест
            </Button>
          ) : (
            <Button onClick={goToNextQuestion}>
              Далее
              <ChevronRight />
            </Button>
          )}
        </div>
      </div>

      <aside className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="font-semibold">Вопросы</div>
          <div className="group relative">
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Описание навигации по вопросам"
            >
              <CircleHelp className="size-4" />
            </button>
            <div className="pointer-events-none absolute right-0 top-9 z-20 hidden w-72 rounded-xl border bg-popover p-4 text-popover-foreground shadow group-hover:block group-focus-within:block">
              <div className="text-sm font-semibold">Навигация по тесту</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Панель помогает перейти к любому вопросу и быстро увидеть,
                какие вопросы уже заполнены.
              </p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-full bg-primary" />
                  Текущий вопрос
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-full border border-primary/40 bg-secondary" />
                  Есть ответ
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-full border bg-background" />
                  Без ответа
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {questions.map((question, index) => {
            const isActive = index === currentQuestionIndex;
            const isAnswered = Boolean(selectedAnswers[index]);

            return (
              <button
                key={question}
                type="button"
                className={[
                  "relative flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent",
                  isAnswered && !isActive ? "border-primary/40 bg-secondary" : "",
                ].join(" ")}
                aria-label={`Открыть вопрос ${index + 1}`}
                aria-current={isActive ? "step" : undefined}
                onClick={() => setCurrentQuestionIndex(index)}
              >
                {index + 1}
                {isAnswered && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckCircle2 className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function PdfView() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex min-h-96 flex-col items-center justify-center rounded-xl bg-muted p-6 text-center">
        <FileText className="size-12 text-primary" />
        <h2 className="mt-4 text-xl font-semibold">Предпросмотр PDF</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Здесь будет встроенный просмотр документа: методические материалы,
          задания, хронологические таблицы или судебная практика.
        </p>
      </div>
    </div>
  );
}

function TextView() {
  return (
    <article className="rounded-xl border bg-card p-6">
      <div className="prose prose-sm max-w-none text-foreground">
        <h2 className="text-xl font-semibold">Материал занятия</h2>
        <p className="mt-3 text-muted-foreground">
          Этот раздел имитирует страницу текстового материала или конспекта,
          который преподаватель размещает внутри дисциплины.
        </p>
        <div className="mt-6 grid gap-4">
          {[
            "Основные определения и термины темы.",
            "Разбор примеров, которые обсуждались на лекции.",
            "Вопросы для самостоятельной подготовки к семинару.",
          ].map((item) => (
            <div key={item} className="rounded-xl bg-muted p-4">
              {item}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function renderResourceBody(type: CourseResourceType) {
  if (type === "presentation") {
    return <PresentationView />;
  }

  if (type === "test") {
    return <TestView />;
  }

  if (type === "pdf") {
    return <PdfView />;
  }

  return <TextView />;
}

export default function CourseResourcePage() {
  const { courseId, resourceId } = useParams();
  const { course, resource } = findCourseResource(courseId, resourceId);

  if (!course || !resource) {
    return (
      <section className="space-y-6" aria-labelledby="resource-not-found-title">
        <Button asChild variant="outline">
          <Link to={courseId ? `/courses/${courseId}` : "/courses"}>
            <ArrowLeft />
            К дисциплине
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle id="resource-not-found-title">
              Материал не найден
            </CardTitle>
            <CardDescription>
              Возможно, материал был удален или ссылка устарела.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  const meta = resourceTypeMeta[resource.type];
  const Icon = meta.icon;

  return (
    <section className="space-y-6" aria-labelledby="resource-title">
      <Button asChild variant="outline">
        <Link to={`/courses/${course.id}`}>
          <ArrowLeft />
          К дисциплине
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{course.title}</Badge>
            <Badge variant="outline">
              <Icon />
              {meta.label}
            </Badge>
          </div>
          <CardTitle id="resource-title" className="text-2xl">
            {resource.title}
          </CardTitle>
          <CardDescription>{resource.description}</CardDescription>
        </CardHeader>
        <CardContent>{renderResourceBody(resource.type)}</CardContent>
      </Card>
    </section>
  );
}
