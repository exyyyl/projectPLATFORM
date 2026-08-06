import { useState } from "react";
import type { NewsRole } from "@/types/news";
import { newsItems } from "@/lib/news-data";
import { NewsCard } from "@/components/shared/news-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


export default function NewsPage() {
  const systemNews = newsItems.filter((n) => n.type === "system");
  const generalNews = newsItems.filter((n) => n.type === "general");
  const [selectedRole, setSelectedRole] = useState<NewsRole>("all");
  const filteredGeneral = generalNews.filter(
    (n) => n.role === selectedRole || n.role === "all",
  );

  return (
    <section className="space-y-6" aria-label="Новости">
      {systemNews.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Системные уведомления</h2>
          <div className="grid gap-3 @2xl:grid-cols-2 @4xl:grid-cols-3 @7xl:grid-cols-4">
            {systemNews.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Новости</h2>
        <Tabs
          value={selectedRole}
          onValueChange={(v) => setSelectedRole(v as NewsRole)}
        >
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="student">Студентам</TabsTrigger>
            <TabsTrigger value="teacher">Преподавателям</TabsTrigger>
          </TabsList>
          <TabsContent value={selectedRole}>
            <div className="space-y-4 mt-4">
              {filteredGeneral.map((news) => (
                <NewsCard key={news.id} news={news} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </section>
  );
}
