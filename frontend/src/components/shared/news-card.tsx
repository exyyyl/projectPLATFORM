import type { NewsItem, NewsRole } from "@/types/news";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

interface NewsCardProps {
  news: NewsItem;
}

const roleLabels: Record<NewsRole, string> = {
  all: "Для всех",
  student: "Студентам",
  teacher: "Преподавателям",
};

export function NewsCard({ news }: NewsCardProps) {
  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(news.date));

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-lg hover:-translate-y-0.5",
        news.type === "system" && "border-warning/50 bg-warning/5",
      )}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            {news.type === "system" && (
              <Info className="size-4 shrink-0 text-warning" />
            )}
            {news.title}
          </CardTitle>
          {news.type === "general" && news.role && (
            <Badge variant="secondary">{roleLabels[news.role]}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p>{news.content}</p>
        <p className="self-end text-xs text-muted-foreground">
          {formattedDate}
        </p>
      </CardContent>{" "}
    </Card>
  );
}
