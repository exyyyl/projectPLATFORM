export type CourseResourceType = "lecture" | "pdf" | "text" | "presentation" | "test";

export interface CourseResource {
  id: string;
  title: string;
  type: CourseResourceType;
  duration: string;
  description: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  status: string;
  level: string;
  headerClassName: string;
  progress: number;
  progressClassName: string;
  lessons: number;
  teacher: {
    name: string;
    role: string;
    initials: string;
    email: string;
  };
  resources: CourseResource[];
}

export const courses: Course[] = [
  {
    id: "mathematical-analysis",
    title: "Математический анализ",
    description:
      "Пределы, производные, интегралы и методы решения задач для инженерных направлений.",
    status: "В процессе",
    level: "2 курс",
    headerClassName: "bg-gradient-to-br from-primary/30 via-accent to-secondary",
    progress: 64,
    progressClassName: "w-2/3",
    lessons: 28,
    teacher: {
      name: "Наталья Игоревна Орлова",
      role: "Доцент кафедры высшей математики",
      initials: "НО",
      email: "n.orlova@university.example",
    },
    resources: [
      { id: "math-01", title: "Лекция: определенный интеграл", type: "lecture", duration: "90 мин", description: "Видеолекция с разбором геометрического смысла интеграла и типовых задач." },
      { id: "math-02", title: "Конспект по рядам", type: "text", duration: "12 страниц", description: "Текстовый материал с основными определениями, признаками сходимости и примерами." },
      { id: "math-03", title: "Задачи к семинару N4", type: "pdf", duration: "PDF", description: "PDF-файл с домашними задачами и критериями оформления решений." },
      { id: "math-04", title: "Презентация по производным", type: "presentation", duration: "18 слайдов", description: "Презентация преподавателя с формулами, графиками и практическими примерами." },
      { id: "math-05", title: "Тест по интегралам", type: "test", duration: "20 вопросов", description: "Проверочный тест по базовым методам интегрирования." },
    ],
  },
  {
    id: "civil-law",
    title: "Гражданское право",
    description:
      "Обязательства, договоры, правоспособность и судебная практика по гражданским делам.",
    status: "Новый модуль",
    level: "3 курс",
    headerClassName: "bg-gradient-to-br from-success/25 via-muted to-primary/20",
    progress: 38,
    progressClassName: "w-1/3",
    lessons: 22,
    teacher: {
      name: "Алексей Петрович Воронцов",
      role: "Профессор кафедры гражданского права",
      initials: "АВ",
      email: "a.vorontsov@university.example",
    },
    resources: [
      { id: "law-01", title: "Лекция: договор купли-продажи", type: "lecture", duration: "80 мин", description: "Лекция о структуре договора, существенных условиях и ответственности сторон." },
      { id: "law-02", title: "ГК РФ: выдержки к семинару", type: "text", duration: "9 страниц", description: "Подборка статей ГК РФ с пояснениями преподавателя." },
      { id: "law-03", title: "Судебная практика", type: "pdf", duration: "PDF", description: "PDF с примерами судебных решений для обсуждения на семинаре." },
      { id: "law-04", title: "Презентация: обязательственное право", type: "presentation", duration: "21 слайд", description: "Ключевые схемы и классификации по обязательственному праву." },
      { id: "law-05", title: "Тест по видам договоров", type: "test", duration: "15 вопросов", description: "Тест на различение договорных конструкций и правовых последствий." },
    ],
  },
  {
    id: "history-of-russia",
    title: "История России",
    description:
      "Ключевые периоды российской истории, источники, историография и работа с документами.",
    status: "Рекомендовано",
    level: "1 курс",
    headerClassName: "bg-gradient-to-br from-warning/25 via-secondary to-accent",
    progress: 18,
    progressClassName: "w-1/12",
    lessons: 16,
    teacher: {
      name: "Виктор Сергеевич Лебедев",
      role: "Старший преподаватель кафедры истории",
      initials: "ВЛ",
      email: "v.lebedev@university.example",
    },
    resources: [
      { id: "history-01", title: "Лекция: реформы Петра I", type: "lecture", duration: "75 мин", description: "Лекция о государственных, военных и культурных преобразованиях начала XVIII века." },
      { id: "history-02", title: "Исторические источники", type: "text", duration: "14 страниц", description: "Текстовый материал о типах источников и способах их анализа." },
      { id: "history-03", title: "Хронологическая таблица", type: "pdf", duration: "PDF", description: "PDF с ключевыми датами и событиями для подготовки к семинару." },
      { id: "history-04", title: "Презентация по XIX веку", type: "presentation", duration: "16 слайдов", description: "Презентация по политическим и социальным процессам XIX века." },
      { id: "history-05", title: "Тест по эпохе реформ", type: "test", duration: "12 вопросов", description: "Тест по основным реформам и историческим деятелям." },
    ],
  },
  {
    id: "general-psychology",
    title: "Общая психология",
    description:
      "Познавательные процессы, личность, мотивация и методы психологического исследования.",
    status: "В процессе",
    level: "2 курс",
    headerClassName: "bg-gradient-to-br from-accent via-secondary to-primary/20",
    progress: 52,
    progressClassName: "w-1/2",
    lessons: 20,
    teacher: {
      name: "Ольга Андреевна Климова",
      role: "Доцент кафедры психологии",
      initials: "ОК",
      email: "o.klimova@university.example",
    },
    resources: [
      { id: "psych-01", title: "Лекция: внимание и память", type: "lecture", duration: "70 мин", description: "Обзор механизмов внимания, памяти и базовых экспериментальных методов." },
      { id: "psych-02", title: "Методы наблюдения", type: "text", duration: "10 страниц", description: "Текстовый материал о наблюдении, интервью и анкетировании." },
      { id: "psych-03", title: "Практикум по тестированию", type: "pdf", duration: "PDF", description: "PDF с заданиями для практической работы в малых группах." },
      { id: "psych-04", title: "Презентация: мотивация", type: "presentation", duration: "14 слайдов", description: "Презентация о теориях мотивации и структуре потребностей." },
      { id: "psych-05", title: "Тест по познавательным процессам", type: "test", duration: "18 вопросов", description: "Проверочный тест по теме внимания, памяти и мышления." },
    ],
  },
  {
    id: "academic-english",
    title: "Академический английский",
    description:
      "Чтение научных текстов, академическое письмо, выступления и терминология специальности.",
    status: "Открыт доступ",
    level: "3 курс",
    headerClassName: "bg-gradient-to-br from-muted via-accent to-success/20",
    progress: 46,
    progressClassName: "w-1/2",
    lessons: 18,
    teacher: {
      name: "Светлана Олеговна Мельникова",
      role: "Старший преподаватель кафедры иностранных языков",
      initials: "СМ",
      email: "s.melnikova@university.example",
    },
    resources: [
      { id: "english-01", title: "Lecture: academic abstracts", type: "lecture", duration: "60 мин", description: "Лекция о структуре аннотаций и академических клише." },
      { id: "english-02", title: "Vocabulary list: law and society", type: "text", duration: "8 страниц", description: "Список терминов и устойчивых выражений для семинара." },
      { id: "english-03", title: "Reading pack", type: "pdf", duration: "PDF", description: "PDF с текстами для чтения и вопросами к обсуждению." },
      { id: "english-04", title: "Presentation: conference talk", type: "presentation", duration: "12 слайдов", description: "Презентация о подготовке короткого академического выступления." },
      { id: "english-05", title: "Quiz: academic vocabulary", type: "test", duration: "16 вопросов", description: "Тест по академической лексике и грамматическим конструкциям." },
    ],
  },
];

export function findCourseById(courseId: string | undefined) {
  return courses.find((course) => course.id === courseId);
}

export function findCourseResource(courseId: string | undefined, resourceId: string | undefined) {
  const course = findCourseById(courseId);
  const resource = course?.resources.find((item) => item.id === resourceId);

  return { course, resource };
}
