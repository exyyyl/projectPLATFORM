import {
  AssignmentStatus,
  GradingType,
  MaterialType,
  NewsTargetRole,
  NotificationType,
  UserRole,
} from '@prisma/client';

export const seedTenant = {
  name: 'Демонстрационный университет',
  domain: 'demo.local',
} as const;

export const seedPassword = 'demo123';

export const seedUsers = {
  admin: {
    email: 'admin@demo.local',
    fullName: 'Анна Администратор',
    role: UserRole.admin,
  },
  teacher: {
    email: 'teacher@demo.local',
    fullName: 'Павел Преподаватель',
    role: UserRole.teacher,
  },
  secondTeacher: {
    email: 'teacher2@demo.local',
    fullName: 'Елена Кузнецова',
    role: UserRole.teacher,
  },
  student: {
    email: 'student@demo.local',
    fullName: 'Иван Студентов',
    role: UserRole.student,
  },
  secondStudent: {
    email: 'student2@demo.local',
    fullName: 'Мария Соколова',
    role: UserRole.student,
  },
  thirdStudent: {
    email: 'student3@demo.local',
    fullName: 'Алексей Орлов',
    role: UserRole.student,
  },
} as const;

export type SeedUserKey = keyof typeof seedUsers;

export const seedGroups = {
  softwareEngineering: {
    name: 'ИВТ-21',
    courseYear: 2,
    direction: 'Программная инженерия',
  },
  informationSystems: {
    name: 'ИС-22',
    courseYear: 2,
    direction: 'Информационные системы',
  },
} as const;

export const seedDisciplines = {
  algorithms: {
    name: 'Алгоритмы и структуры данных',
    description: 'Базовые алгоритмы, структуры данных и оценка сложности.',
  },
  databases: {
    name: 'Базы данных',
    description: 'Проектирование реляционных БД, SQL и транзакции.',
  },
  webDevelopment: {
    name: 'Веб-разработка',
    description: 'Создание современных клиент-серверных приложений.',
  },
} as const;

export const seedBlocks = {
  algorithmsTheory: {
    title: 'Теория',
    orderIndex: 1,
    content: {
      kind: 'rich-text',
      text: 'Асимптотическая сложность и базовые структуры данных.',
    },
  },
  algorithmsPractice: {
    title: 'Практика',
    orderIndex: 2,
    content: {
      kind: 'rich-text',
      text: 'Разбор задач на сортировки и графы.',
    },
  },
  databasesTheory: {
    title: 'Реляционная модель',
    orderIndex: 1,
    content: {
      kind: 'rich-text',
      text: 'Таблицы, ключи, связи и нормальные формы.',
    },
  },
  databasesPractice: {
    title: 'SQL-практикум',
    orderIndex: 2,
    content: {
      kind: 'rich-text',
      text: 'Запросы, индексы и анализ планов выполнения.',
    },
  },
  webTheory: {
    title: 'Клиент и сервер',
    orderIndex: 1,
    content: {
      kind: 'rich-text',
      text: 'HTTP, REST API и архитектура веб-приложения.',
    },
  },
} as const;

export const seedCatalog = {
  materials: {
    algorithmsLecture: {
      title: 'Лекция: оценка сложности',
      type: MaterialType.file,
      filePath: 'seed/materials/algorithms/complexity.pdf',
    },
    algorithmsReference: {
      title: 'Визуализатор алгоритмов',
      type: MaterialType.link,
      url: 'https://visualgo.net/',
    },
    databaseCheatSheet: {
      title: 'Шпаргалка по SQL',
      type: MaterialType.file,
      filePath: 'seed/materials/databases/sql-cheat-sheet.pdf',
    },
    webReference: {
      title: 'Справочник MDN',
      type: MaterialType.link,
      url: 'https://developer.mozilla.org/',
    },
  },
  assignments: {
    algorithmsHomework: {
      title: 'Сравнение алгоритмов сортировки',
      description:
        'Реализуйте три алгоритма сортировки и сравните время их работы.',
      gradingType: GradingType.scored,
      maxScore: 100,
      status: AssignmentStatus.closed,
      allowedExtensions: ['ts', 'js', 'zip'],
    },
    databaseLab: {
      title: 'Нормализация учебной базы данных',
      description:
        'Спроектируйте схему данных и приведите её к третьей нормальной форме.',
      gradingType: GradingType.pass_fail,
      maxScore: null,
      status: AssignmentStatus.published,
      allowedExtensions: ['pdf', 'sql', 'zip'],
    },
    webProject: {
      title: 'REST API для библиотеки',
      description: 'Подготовьте API и документацию для учебного проекта.',
      gradingType: GradingType.scored,
      maxScore: 50,
      status: AssignmentStatus.draft,
      allowedExtensions: ['zip'],
    },
  },
  notifications: {
    submission: NotificationType.submission_received,
    grade: NotificationType.grade_posted,
    chat: NotificationType.chat_message,
    news: NotificationType.news_published,
    assignment: NotificationType.assignment_published,
  },
  newsTargets: {
    all: NewsTargetRole.all,
    students: NewsTargetRole.student,
    teachers: NewsTargetRole.teacher,
    admins: NewsTargetRole.admin,
  },
} as const;
