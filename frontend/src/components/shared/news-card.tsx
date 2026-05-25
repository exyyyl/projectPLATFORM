import type { NewsItem, NewsRole } from "@/types/news";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NewsCardProps {
  news: NewsItem;
}

const roleLabels: Record<NewsRole, string> = {
    all: 'Для всех',
    student: 'Студентам',
    teacher: 'Преподавателям',
}

export function NewsCard({ news }: NewsCardProps) {
  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(news.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{news.title}</CardTitle>
        <div>
        <p>{formattedDate}</p>
        {news.type === 'general' && news.role && (
            <Badge>{roleLabels[news.role]}</Badge>
        )}
        </div>
      </CardHeader>
      <CardContent>{news.content}</CardContent>
    </Card>
  );
}
