import { PrismaPg } from '@prisma/adapter-pg';
import {
  CourseStatus,
  GradeResult,
  MaterialReleaseStatus,
  NewsStatus,
  Prisma,
  PrismaClient,
  type User,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import {
  seedBlocks,
  seedCatalog,
  seedDisciplines,
  seedGroups,
  seedPassword,
  seedTenant,
  seedUsers,
  type SeedUserKey,
} from './seed-data';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_IN_MS);
}

function typedEntries<T extends object>(
  value: T,
): Array<{ [K in keyof T]: [K, T[K]] }[keyof T]> {
  return Object.entries(value) as Array<
    {
      [K in keyof T]: [K, T[K]];
    }[keyof T]
  >;
}

async function clearSeedTenantData(
  tx: Prisma.TransactionClient,
  tenantId: number,
): Promise<void> {
  const tenantUsers = { user: { tenantId } };

  await tx.refreshToken.deleteMany({ where: tenantUsers });
  await tx.notification.deleteMany({ where: tenantUsers });
  await tx.auditLog.deleteMany({ where: tenantUsers });
  await tx.news.deleteMany({ where: { tenantId } });
  await tx.courseTemplate.deleteMany({ where: { tenantId } });

  // Cascades remove courses, blocks, materials, assignments, submissions,
  // files, grades, chats, hidden courses and discipline junction tables.
  await tx.discipline.deleteMany({ where: { tenantId } });
  // Cascades remove user_groups and any remaining discipline_groups.
  await tx.group.deleteMany({ where: { tenantId } });
}

async function upsertUsers(
  tx: Prisma.TransactionClient,
  tenantId: number,
  passwordHash: string,
): Promise<Record<SeedUserKey, User>> {
  const users = {} as Record<SeedUserKey, User>;

  for (const [key, userData] of typedEntries(seedUsers)) {
    users[key] = await tx.user.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email: userData.email,
        },
      },
      update: {
        fullName: userData.fullName,
        role: userData.role,
        passwordHash,
        isActive: true,
      },
      create: {
        tenantId,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        passwordHash,
      },
    });
  }

  return users;
}

async function seedDatabase(prisma: PrismaClient): Promise<void> {
  const [passwordHash, refreshTokenHash] = await Promise.all([
    bcrypt.hash(seedPassword, 12),
    bcrypt.hash('demo-refresh-token', 12),
  ]);

  await prisma.$transaction(
    async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { domain: seedTenant.domain },
        update: {
          name: seedTenant.name,
          isActive: true,
        },
        create: seedTenant,
      });

      await clearSeedTenantData(tx, tenant.id);
      await tx.user.deleteMany({
        where: {
          tenantId: tenant.id,
          email: 'superadmin@platform.local',
          role: UserRole.superadmin,
        },
      });
      const users = await upsertUsers(tx, tenant.id, passwordHash);

      await tx.refreshToken.create({
        data: {
          userId: users.student.id,
          tokenHash: refreshTokenHash,
          expiresAt: daysFromNow(7),
        },
      });

      const [softwareEngineeringGroup, informationSystemsGroup] =
        await Promise.all([
          tx.group.create({
            data: {
              tenantId: tenant.id,
              ...seedGroups.softwareEngineering,
            },
          }),
          tx.group.create({
            data: {
              tenantId: tenant.id,
              ...seedGroups.informationSystems,
            },
          }),
        ]);

      await tx.userGroup.createMany({
        data: [
          {
            userId: users.student.id,
            groupId: softwareEngineeringGroup.id,
          },
          {
            userId: users.secondStudent.id,
            groupId: softwareEngineeringGroup.id,
          },
          {
            userId: users.thirdStudent.id,
            groupId: informationSystemsGroup.id,
          },
        ],
      });

      const [algorithms, databases, webDevelopment] = await Promise.all([
        tx.discipline.create({
          data: {
            tenantId: tenant.id,
            ...seedDisciplines.algorithms,
          },
        }),
        tx.discipline.create({
          data: {
            tenantId: tenant.id,
            ...seedDisciplines.databases,
          },
        }),
        tx.discipline.create({
          data: {
            tenantId: tenant.id,
            ...seedDisciplines.webDevelopment,
          },
        }),
      ]);

      await tx.disciplineTeacher.createMany({
        data: [
          {
            disciplineId: algorithms.id,
            userId: users.teacher.id,
          },
          {
            disciplineId: databases.id,
            userId: users.secondTeacher.id,
          },
          {
            disciplineId: webDevelopment.id,
            userId: users.teacher.id,
          },
        ],
      });

      await tx.disciplineGroup.createMany({
        data: [
          {
            disciplineId: algorithms.id,
            groupId: softwareEngineeringGroup.id,
          },
          {
            disciplineId: databases.id,
            groupId: softwareEngineeringGroup.id,
          },
          {
            disciplineId: databases.id,
            groupId: informationSystemsGroup.id,
          },
          {
            disciplineId: webDevelopment.id,
            groupId: informationSystemsGroup.id,
          },
        ],
      });

      await tx.teachingAssignment.createMany({
        data: [
          {
            disciplineId: algorithms.id,
            teacherId: users.teacher.id,
            groupId: softwareEngineeringGroup.id,
          },
          {
            disciplineId: databases.id,
            teacherId: users.secondTeacher.id,
            groupId: softwareEngineeringGroup.id,
          },
          {
            disciplineId: databases.id,
            teacherId: users.secondTeacher.id,
            groupId: informationSystemsGroup.id,
          },
          {
            disciplineId: webDevelopment.id,
            teacherId: users.teacher.id,
            groupId: informationSystemsGroup.id,
          },
        ],
      });

      const [algorithmsTemplate, databasesTemplate, webDevelopmentTemplate] =
        await Promise.all([
          tx.courseTemplate.create({
            data: {
              tenantId: tenant.id,
              disciplineId: algorithms.id,
              ownerId: users.teacher.id,
              title: algorithms.name,
              description: algorithms.description ?? '',
            },
          }),
          tx.courseTemplate.create({
            data: {
              tenantId: tenant.id,
              disciplineId: databases.id,
              ownerId: users.secondTeacher.id,
              title: databases.name,
              description: databases.description ?? '',
            },
          }),
          tx.courseTemplate.create({
            data: {
              tenantId: tenant.id,
              disciplineId: webDevelopment.id,
              ownerId: users.teacher.id,
              title: webDevelopment.name,
              description: webDevelopment.description ?? '',
            },
          }),
        ]);

      const [algorithmsCourse, databasesCourse, webDevelopmentCourse] =
        await Promise.all([
          tx.course.create({
            data: {
              templateId: algorithmsTemplate.id,
              templateVersion: algorithmsTemplate.version,
              disciplineId: algorithms.id,
              teacherId: users.teacher.id,
              title: algorithms.name,
              description: algorithms.description ?? '',
              status: CourseStatus.published,
              academicYear: '2026/2027',
              semester: 1,
              startsAt: daysFromNow(-30),
              endsAt: daysFromNow(120),
            },
          }),
          tx.course.create({
            data: {
              templateId: databasesTemplate.id,
              templateVersion: databasesTemplate.version,
              disciplineId: databases.id,
              teacherId: users.secondTeacher.id,
              title: databases.name,
              description: databases.description ?? '',
              status: CourseStatus.published,
              academicYear: '2026/2027',
              semester: 1,
              startsAt: daysFromNow(-30),
              endsAt: daysFromNow(120),
            },
          }),
          tx.course.create({
            data: {
              templateId: webDevelopmentTemplate.id,
              templateVersion: webDevelopmentTemplate.version,
              disciplineId: webDevelopment.id,
              teacherId: users.teacher.id,
              title: webDevelopment.name,
              description: webDevelopment.description ?? '',
              status: CourseStatus.published,
              academicYear: '2026/2027',
              semester: 1,
              startsAt: daysFromNow(-30),
              endsAt: daysFromNow(120),
            },
          }),
        ]);

      const teachingAssignments = await tx.teachingAssignment.findMany({
        where: {
          disciplineId: {
            in: [algorithms.id, databases.id, webDevelopment.id],
          },
        },
      });
      const courseGroups = await Promise.all(
        teachingAssignments.map((assignment) => {
          const courseId =
            assignment.disciplineId === algorithms.id
              ? algorithmsCourse.id
              : assignment.disciplineId === databases.id
                ? databasesCourse.id
                : webDevelopmentCourse.id;
          return tx.courseGroup.create({
            data: { courseId, teachingAssignmentId: assignment.id },
          });
        }),
      );

      const [
        algorithmsTheoryBlock,
        algorithmsPracticeBlock,
        ,
        databasesPracticeBlock,
        webTheoryBlock,
      ] = await Promise.all([
        tx.courseBlock.create({
          data: {
            courseId: algorithmsCourse.id,
            ...seedBlocks.algorithmsTheory,
          },
        }),
        tx.courseBlock.create({
          data: {
            courseId: algorithmsCourse.id,
            ...seedBlocks.algorithmsPractice,
          },
        }),
        tx.courseBlock.create({
          data: {
            courseId: databasesCourse.id,
            ...seedBlocks.databasesTheory,
          },
        }),
        tx.courseBlock.create({
          data: {
            courseId: databasesCourse.id,
            ...seedBlocks.databasesPractice,
          },
        }),
        tx.courseBlock.create({
          data: {
            courseId: webDevelopmentCourse.id,
            ...seedBlocks.webTheory,
          },
        }),
      ]);

      const [
        algorithmsTemplateTheoryBlock,
        algorithmsTemplatePracticeBlock,
        ,
        databasesTemplatePracticeBlock,
        webTemplateTheoryBlock,
      ] = await Promise.all([
        tx.courseTemplateBlock.create({
          data: {
            templateId: algorithmsTemplate.id,
            ...seedBlocks.algorithmsTheory,
          },
        }),
        tx.courseTemplateBlock.create({
          data: {
            templateId: algorithmsTemplate.id,
            ...seedBlocks.algorithmsPractice,
          },
        }),
        tx.courseTemplateBlock.create({
          data: {
            templateId: databasesTemplate.id,
            ...seedBlocks.databasesTheory,
          },
        }),
        tx.courseTemplateBlock.create({
          data: {
            templateId: databasesTemplate.id,
            ...seedBlocks.databasesPractice,
          },
        }),
        tx.courseTemplateBlock.create({
          data: {
            templateId: webDevelopmentTemplate.id,
            ...seedBlocks.webTheory,
          },
        }),
      ]);

      await tx.material.createMany({
        data: [
          {
            courseId: algorithmsCourse.id,
            blockId: algorithmsTheoryBlock.id,
            uploadedBy: users.teacher.id,
            ...seedCatalog.materials.algorithmsLecture,
          },
          {
            courseId: algorithmsCourse.id,
            blockId: algorithmsPracticeBlock.id,
            uploadedBy: users.teacher.id,
            ...seedCatalog.materials.algorithmsReference,
          },
          {
            courseId: databasesCourse.id,
            blockId: databasesPracticeBlock.id,
            uploadedBy: users.secondTeacher.id,
            ...seedCatalog.materials.databaseCheatSheet,
          },
          {
            courseId: webDevelopmentCourse.id,
            blockId: webTheoryBlock.id,
            uploadedBy: users.teacher.id,
            ...seedCatalog.materials.webReference,
          },
        ],
      });

      const seededMaterials = await tx.material.findMany({
        where: {
          courseId: {
            in: [
              algorithmsCourse.id,
              databasesCourse.id,
              webDevelopmentCourse.id,
            ],
          },
        },
      });
      await tx.materialRelease.createMany({
        data: seededMaterials.flatMap((material) =>
          courseGroups
            .filter((courseGroup) => courseGroup.courseId === material.courseId)
            .map((courseGroup) => ({
              materialId: material.id,
              courseGroupId: courseGroup.id,
              status: MaterialReleaseStatus.published,
              publishedAt: daysFromNow(-5),
            })),
        ),
      });

      const [algorithmsHomework, databaseLab] = await Promise.all([
        tx.assignment.create({
          data: {
            courseId: algorithmsCourse.id,
            blockId: algorithmsPracticeBlock.id,
            createdBy: users.teacher.id,
            deadline: daysFromNow(-7),
            ...seedCatalog.assignments.algorithmsHomework,
            allowedExtensions: [
              ...seedCatalog.assignments.algorithmsHomework.allowedExtensions,
            ],
          },
        }),
        tx.assignment.create({
          data: {
            courseId: databasesCourse.id,
            blockId: databasesPracticeBlock.id,
            createdBy: users.secondTeacher.id,
            deadline: daysFromNow(7),
            ...seedCatalog.assignments.databaseLab,
            allowedExtensions: [
              ...seedCatalog.assignments.databaseLab.allowedExtensions,
            ],
          },
        }),
        tx.assignment.create({
          data: {
            courseId: webDevelopmentCourse.id,
            blockId: webTheoryBlock.id,
            createdBy: users.teacher.id,
            deadline: null,
            ...seedCatalog.assignments.webProject,
            allowedExtensions: [
              ...seedCatalog.assignments.webProject.allowedExtensions,
            ],
          },
        }),
      ]);

      await tx.courseTemplateAssignment.createMany({
        data: [
          {
            templateId: algorithmsTemplate.id,
            blockId: algorithmsTemplatePracticeBlock.id,
            createdBy: users.teacher.id,
            deadlineOffsetDays: 21,
            ...seedCatalog.assignments.algorithmsHomework,
            allowedExtensions: [
              ...seedCatalog.assignments.algorithmsHomework.allowedExtensions,
            ],
          },
          {
            templateId: databasesTemplate.id,
            blockId: databasesTemplatePracticeBlock.id,
            createdBy: users.secondTeacher.id,
            deadlineOffsetDays: 30,
            ...seedCatalog.assignments.databaseLab,
            allowedExtensions: [
              ...seedCatalog.assignments.databaseLab.allowedExtensions,
            ],
          },
          {
            templateId: webDevelopmentTemplate.id,
            blockId: webTemplateTheoryBlock.id,
            createdBy: users.teacher.id,
            deadlineOffsetDays: 45,
            ...seedCatalog.assignments.webProject,
            allowedExtensions: [
              ...seedCatalog.assignments.webProject.allowedExtensions,
            ],
          },
        ].map(({ status: _status, ...assignment }) => assignment),
      });

      void algorithmsTemplateTheoryBlock;

      const [
        algorithmsSubmission,
        passedDatabaseSubmission,
        failedDatabaseSubmission,
      ] = await Promise.all([
        tx.submission.create({
          data: {
            assignmentId: algorithmsHomework.id,
            studentId: users.student.id,
            submittedAt: daysFromNow(-10),
            attemptNumber: 1,
            studentComment:
              'Реализация и результаты замеров находятся в архиве.',
          },
        }),
        tx.submission.create({
          data: {
            assignmentId: databaseLab.id,
            studentId: users.secondStudent.id,
            submittedAt: daysFromNow(-1),
            attemptNumber: 1,
            studentComment: 'Приложены схема и SQL-скрипт.',
          },
        }),
        tx.submission.create({
          data: {
            assignmentId: databaseLab.id,
            studentId: users.student.id,
            submittedAt: daysFromNow(-2),
            attemptNumber: 1,
            studentComment: 'Первая версия схемы.',
          },
        }),
      ]);

      await tx.submissionFile.createMany({
        data: [
          {
            submissionId: algorithmsSubmission.id,
            filePath: 'seed/submissions/sorting-benchmark.zip',
            originalName: 'sorting-benchmark.zip',
            mimeType: 'application/zip',
            sizeBytes: 24576,
          },
          {
            submissionId: passedDatabaseSubmission.id,
            filePath: 'seed/submissions/database-design.pdf',
            originalName: 'database-design.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 184320,
          },
          {
            submissionId: passedDatabaseSubmission.id,
            filePath: 'seed/submissions/schema.sql',
            originalName: 'schema.sql',
            mimeType: 'application/sql',
            sizeBytes: 8192,
          },
          {
            submissionId: failedDatabaseSubmission.id,
            filePath: 'seed/submissions/schema-v1.sql',
            originalName: 'schema-v1.sql',
            mimeType: 'application/sql',
            sizeBytes: 6144,
          },
        ],
      });

      await tx.grade.createMany({
        data: [
          {
            submissionId: algorithmsSubmission.id,
            graderId: users.teacher.id,
            score: new Prisma.Decimal('87.50'),
            comment: 'Хорошая работа, но не хватает анализа расхода памяти.',
            gradedAt: daysFromNow(-8),
          },
          {
            submissionId: passedDatabaseSubmission.id,
            graderId: users.secondTeacher.id,
            result: GradeResult.passed,
            comment: 'Схема нормализована корректно.',
            gradedAt: daysFromNow(0),
          },
          {
            submissionId: failedDatabaseSubmission.id,
            graderId: users.secondTeacher.id,
            result: GradeResult.failed,
            comment:
              'Устраните транзитивную зависимость и отправьте новую попытку.',
            gradedAt: daysFromNow(-1),
          },
        ],
      });

      const chatMessages = await Promise.all([
        tx.chatMessage.create({
          data: {
            assignmentId: databaseLab.id,
            senderId: users.student.id,
            content: 'Можно ли использовать UUID в качестве первичных ключей?',
            createdAt: daysFromNow(-3),
          },
        }),
        tx.chatMessage.create({
          data: {
            assignmentId: databaseLab.id,
            senderId: users.secondTeacher.id,
            content: 'Да, если выбор будет обоснован в пояснительной записке.',
            createdAt: daysFromNow(-3),
          },
        }),
      ]);

      await tx.notification.createMany({
        data: [
          {
            userId: users.secondTeacher.id,
            type: seedCatalog.notifications.submission,
            referenceId: passedDatabaseSubmission.id,
            referenceType: 'Submission',
          },
          {
            userId: users.student.id,
            type: seedCatalog.notifications.grade,
            referenceId: algorithmsSubmission.id,
            referenceType: 'Grade',
            isRead: true,
          },
          {
            userId: users.student.id,
            type: seedCatalog.notifications.chat,
            referenceId: chatMessages[1].id,
            referenceType: 'ChatMessage',
          },
          {
            userId: users.secondStudent.id,
            type: seedCatalog.notifications.news,
            referenceType: 'News',
          },
          {
            userId: users.thirdStudent.id,
            type: seedCatalog.notifications.assignment,
            referenceId: databaseLab.id,
            referenceType: 'Assignment',
          },
        ],
      });

      await tx.news.createMany({
        data: [
          {
            tenantId: tenant.id,
            title: 'Добро пожаловать на платформу',
            excerpt: 'Учебные курсы и задания уже доступны.',
            bodyMarkdown:
              '# Добро пожаловать\n\nВ демонстрационной среде доступны **учебные курсы** и задания.',
            targetRole: seedCatalog.newsTargets.all,
            status: NewsStatus.published,
            publishedAt: daysFromNow(-4),
            createdBy: users.admin.id,
          },
          {
            tenantId: tenant.id,
            title: 'Студенческая конференция',
            excerpt: 'Регистрация докладов открыта до конца месяца.',
            bodyMarkdown:
              '## Студенческая конференция\n\nРегистрация докладов открыта до конца месяца.',
            targetRole: seedCatalog.newsTargets.students,
            status: NewsStatus.published,
            publishedAt: daysFromNow(-3),
            createdBy: users.admin.id,
          },
          {
            tenantId: tenant.id,
            title: 'Методический семинар',
            excerpt: 'Семинар для преподавателей состоится в пятницу.',
            bodyMarkdown:
              '## Методический семинар\n\nСеминар для преподавателей состоится **в пятницу**.',
            targetRole: seedCatalog.newsTargets.teachers,
            status: NewsStatus.published,
            publishedAt: daysFromNow(-2),
            createdBy: users.admin.id,
          },
          {
            tenantId: tenant.id,
            title: 'Обновление регламента',
            excerpt: 'Администраторам доступна новая версия регламента.',
            bodyMarkdown:
              '## Обновление регламента\n\nАдминистраторам доступна новая версия регламента.',
            targetRole: seedCatalog.newsTargets.admins,
            status: NewsStatus.draft,
            createdBy: users.admin.id,
          },
        ],
      });

      await tx.hiddenCourse.create({
        data: {
          userId: users.student.id,
          courseId: webDevelopmentCourse.id,
        },
      });

      await tx.auditLog.createMany({
        data: [
          {
            userId: users.admin.id,
            action: 'seed.create',
            entity: 'Tenant',
            entityId: tenant.id,
            ip: '127.0.0.1',
          },
          {
            userId: users.teacher.id,
            action: 'assignment.publish',
            entity: 'Assignment',
            entityId: algorithmsHomework.id,
            ip: '127.0.0.1',
          },
          {
            userId: users.secondTeacher.id,
            action: 'grade.create',
            entity: 'Submission',
            entityId: passedDatabaseSubmission.id,
            ip: '127.0.0.1',
          },
        ],
      });
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}

async function getTableCounts(
  prisma: PrismaClient,
): Promise<Record<string, number>> {
  return {
    tenants: await prisma.tenant.count(),
    users: await prisma.user.count(),
    refresh_tokens: await prisma.refreshToken.count(),
    groups: await prisma.group.count(),
    user_groups: await prisma.userGroup.count(),
    disciplines: await prisma.discipline.count(),
    discipline_teachers: await prisma.disciplineTeacher.count(),
    discipline_groups: await prisma.disciplineGroup.count(),
    teaching_assignments: await prisma.teachingAssignment.count(),
    course_templates: await prisma.courseTemplate.count(),
    course_template_blocks: await prisma.courseTemplateBlock.count(),
    course_template_assignments:
      await prisma.courseTemplateAssignment.count(),
    courses: await prisma.course.count(),
    course_groups: await prisma.courseGroup.count(),
    course_blocks: await prisma.courseBlock.count(),
    materials: await prisma.material.count(),
    material_releases: await prisma.materialRelease.count(),
    assignments: await prisma.assignment.count(),
    submissions: await prisma.submission.count(),
    submission_files: await prisma.submissionFile.count(),
    grades: await prisma.grade.count(),
    chat_messages: await prisma.chatMessage.count(),
    notifications: await prisma.notification.count(),
    news: await prisma.news.count(),
    hidden_courses: await prisma.hiddenCourse.count(),
    audit_logs: await prisma.auditLog.count(),
  };
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await seedDatabase(prisma);
    const counts = await getTableCounts(prisma);
    const emptyTables = Object.entries(counts)
      .filter(([, count]) => count === 0)
      .map(([table]) => table);

    if (emptyTables.length > 0) {
      throw new Error(`Seed left empty tables: ${emptyTables.join(', ')}`);
    }

    process.stdout.write(
      [
        `Seed completed for tenant "${seedTenant.name}".`,
        `Demo password for all users: ${seedPassword}`,
        ...typedEntries(seedUsers).map(
          ([, user]) => `  ${user.role}: ${user.email}`,
        ),
        'Rows by table:',
        ...Object.entries(counts).map(
          ([table, count]) => `  ${table}: ${count}`,
        ),
        '',
      ].join('\n'),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
