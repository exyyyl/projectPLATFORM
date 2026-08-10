import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CourseStatus, NotificationType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { API_PREFIX } from './../src/common/constants';
import { PrismaService } from './../src/prisma/prisma.service';

interface TokenResponse {
  accessToken: string;
}

interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

interface AdminUsersListResponse {
  items: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface GroupResponse {
  id: number;
  name: string;
  studentCount: number;
  students: Array<{ id: number; email: string }>;
}

interface TeachingAssignmentResponse {
  id: number;
  teacher: { id: number; email: string };
  group: { id: number; name: string };
}

interface DisciplineResponse {
  id: number;
  name: string;
  teacherCount: number;
  groupCount: number;
  teachingAssignmentCount: number;
  teachers: Array<{ id: number; email: string }>;
  groups: Array<{ id: number; name: string }>;
  teachingAssignments: TeachingAssignmentResponse[];
}

interface NewsResponse {
  id: number;
  title: string;
  excerpt: string;
  bodyMarkdown?: string;
  targetRole: string;
  status: string;
  publishedAt: string | null;
}

interface NewsListResponse {
  items: NewsResponse[];
  pagination: { total: number };
}

interface TeacherAcademicOverview {
  role: 'teacher';
  disciplines: Array<{
    id: number;
    name: string;
    groups: Array<{
      teachingAssignmentId: number;
      id: number;
      name: string;
    }>;
  }>;
}

interface CourseDetailResponse {
  id: number;
  title: string;
  status: string;
  courseGroups: Array<{
    id: number;
    teachingAssignment: { group: { id: number; name: string } };
  }>;
  materials: Array<{
    id: number;
    title: string;
    releases: Array<{ id: number; courseGroupId: number; status: string }>;
  }>;
}

interface NotificationsResponse {
  items: Array<{
    id: number;
    type: string;
    referenceId: number | null;
    title: string | null;
    body: string | null;
    isRead: boolean;
  }>;
  unreadCount: number;
}

interface CourseTemplateResponse {
  id: number;
  title: string;
  version: number;
  isActive: boolean;
  blocks: Array<{ id: number; title: string; orderIndex: number }>;
  assignments: Array<{
    id: number;
    title: string;
    deadlineOffsetDays: number | null;
  }>;
}

interface AssignmentResponse {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  allowedExtensions: string[];
  maxAttempts: number;
  maxFiles: number;
  maxFileSizeBytes: number;
  maxTotalSizeBytes: number;
  allowLateSubmissions: boolean;
}

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get(PrismaService);
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(API_PREFIX, {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves explicitly public routes', async () => {
    await request(app.getHttpServer())
      .get(`/${API_PREFIX}`)
      .expect(200)
      .expect('Hello World!');

    const health = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(health.body as Record<string, unknown>).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
    });
  });

  it('blocks a protected route without an access token', () => {
    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/courses`)
      .expect(401);
  });

  it('allows login for guests but blocks login and registration for authenticated users', async () => {
    const student = await login('student@demo.local');

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({
        email: 'student@demo.local',
        password: 'demo123',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({
        email: 'new-student@demo.local',
        password: 'password123',
        name: 'New Student',
      })
      .expect(403);
  });

  it('uses a dedicated admin login without duplicating authentication', async () => {
    const adminResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/admin/login`)
      .send({ email: 'admin@demo.local', password: 'demo123' })
      .expect(201);
    expect((adminResponse.body as TokenResponse).accessToken).toEqual(
      expect.any(String),
    );
    expect(getRefreshCookie(adminResponse)).toContain('refreshToken=');

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/admin/login`)
      .send({ email: 'teacher@demo.local', password: 'demo123' })
      .expect(401);
  });

  it('enforces student, teacher and admin roles', async () => {
    const student = await login('student@demo.local');
    await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/users`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/submissions/1/grade`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(403);

    const teacher = await login('teacher@demo.local');
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/submissions/1/grade`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(201);

    const admin = await login('admin@demo.local');
    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/users`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const users = response.body as AdminUsersListResponse;
    expect(users.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'admin@demo.local', role: 'admin' }),
      ]),
    );
  });

  it('returns a role-specific academic overview and protects superadmin role assignment', async () => {
    const [student, teacher, admin] = await Promise.all([
      login('student@demo.local'),
      login('teacher@demo.local'),
      login('admin@demo.local'),
    ]);

    const studentOverview = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/academic/overview`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200);
    expect(studentOverview.body).toEqual(
      expect.objectContaining({
        role: 'student',
        groups: expect.arrayContaining([
          expect.objectContaining({
            name: 'ИВТ-21',
            disciplines: expect.any(Array),
          }),
        ]),
      }),
    );

    const teacherOverview = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/academic/overview`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);
    expect(teacherOverview.body).toEqual(
      expect.objectContaining({
        role: 'teacher',
        disciplines: expect.arrayContaining([
          expect.objectContaining({ name: 'Алгоритмы и структуры данных' }),
        ]),
      }),
    );

    const adminOverview = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/academic/overview`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(adminOverview.body).toEqual(
      expect.objectContaining({
        role: 'admin',
        summary: expect.objectContaining({ users: 6, groups: 2 }),
      }),
    );

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/users`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email: 'forbidden-superadmin@demo.local',
        fullName: 'Forbidden Superadmin',
        password: 'password123',
        role: 'superadmin',
      })
      .expect(403);

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { domain: 'demo.local' },
    });
    const superadminEmail = 'e2e-superadmin@platform.local';
    const superadminPassword = 'e2e-superadmin-password';
    const superadminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: superadminEmail,
        fullName: 'E2E Superadmin',
        passwordHash: await bcrypt.hash(superadminPassword, 12),
        role: UserRole.superadmin,
      },
    });
    try {
      const superadminResponse = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/admin/login`)
        .send({ email: superadminEmail, password: superadminPassword })
        .expect(201);
      const superadmin = superadminResponse.body as TokenResponse;
      const superadminOverview = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/academic/overview`)
        .set('Authorization', `Bearer ${superadmin.accessToken}`)
        .expect(200);
      expect(superadminOverview.body).toEqual(
        expect.objectContaining({
          role: 'superadmin',
          tenants: expect.arrayContaining([
            expect.objectContaining({ domain: 'demo.local' }),
          ]),
        }),
      );
    } finally {
      await prisma.user.delete({ where: { id: superadminUser.id } });
    }
  });

  it('supports the tenant-scoped admin user lifecycle', async () => {
    const admin = await login('admin@demo.local');
    const adminProfile = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const adminId = (adminProfile.body as UserResponse).id;
    const email = `managed-${Date.now()}@demo.local`;

    const createdResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/users`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email,
        fullName: 'Managed Student',
        role: 'student',
        password: 'managed-password',
      })
      .expect(201);
    const createdUser = createdResponse.body as UserResponse;

    expect(createdUser).toEqual(
      expect.objectContaining({
        email,
        fullName: 'Managed Student',
        role: 'student',
        isActive: true,
      }),
    );
    expect(createdUser).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/users`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        email,
        fullName: 'Duplicate Student',
        role: 'student',
        password: 'managed-password',
      })
      .expect(409);

    const listResponse = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/users`)
      .query({
        page: 1,
        limit: 5,
        search: 'managed student',
        role: 'student',
        isActive: 'true',
      })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const users = listResponse.body as AdminUsersListResponse;
    expect(users.items).toEqual([
      expect.objectContaining({ id: createdUser.id, email }),
    ]);
    expect(users.pagination).toEqual({
      page: 1,
      limit: 5,
      total: 1,
      totalPages: 1,
    });

    await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toEqual(expect.objectContaining({ email }));
      });

    await request(app.getHttpServer())
      .put(`/${API_PREFIX}/admin/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({})
      .expect(400);

    const updatedResponse = await request(app.getHttpServer())
      .put(`/${API_PREFIX}/admin/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        fullName: 'Managed Teacher',
        role: 'teacher',
        password: 'updated-password',
      })
      .expect(200);
    expect(updatedResponse.body).toEqual(
      expect.objectContaining({
        id: createdUser.id,
        fullName: 'Managed Teacher',
        role: 'teacher',
      }),
    );

    const managedLogin = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({ email, password: 'updated-password' })
      .expect(201);
    const managedRefreshCookie = getRefreshCookie(managedLogin);

    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/admin/users/${adminId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(400);

    const deactivatedResponse = await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/admin/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(deactivatedResponse.body).toEqual(
      expect.objectContaining({ id: createdUser.id, isActive: false }),
    );

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/refresh`)
      .set('Cookie', managedRefreshCookie)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({ email, password: 'updated-password' })
      .expect(401);

    const inactiveList = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/users`)
      .query({ search: email, isActive: 'false' })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const inactiveUsers = inactiveList.body as AdminUsersListResponse;
    expect(inactiveUsers.items).toEqual([
      expect.objectContaining({ id: createdUser.id, isActive: false }),
    ]);
  });

  it('manages groups, students and teacher-discipline-group assignments', async () => {
    const admin = await login('admin@demo.local');
    const [student, secondStudent, teacher] = await Promise.all([
      findAdminUser(admin.accessToken, 'student@demo.local'),
      findAdminUser(admin.accessToken, 'student2@demo.local'),
      findAdminUser(admin.accessToken, 'teacher@demo.local'),
    ]);
    const suffix = Date.now();
    const groupName = `TEST-${suffix}`;
    const disciplineName = `Тестовая дисциплина ${suffix}`;

    const createdGroupResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/groups`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: groupName,
        courseYear: 3,
        direction: 'Тестовое направление',
      })
      .expect(201);
    const group = createdGroupResponse.body as GroupResponse;
    expect(group).toEqual(
      expect.objectContaining({
        name: groupName,
        studentCount: 0,
        students: [],
      }),
    );

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/groups`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: groupName })
      .expect(409);

    const assignedGroupResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/groups/${group.id}/students`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentIds: [student.id, secondStudent.id] })
      .expect(200);
    const assignedGroup = assignedGroupResponse.body as GroupResponse;
    expect(assignedGroup.studentCount).toBe(2);
    expect(assignedGroup.students).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: student.id }),
        expect.objectContaining({ id: secondStudent.id }),
      ]),
    );

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/groups/${group.id}/students`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ studentIds: [teacher.id] })
      .expect(400);

    const groupsList = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/groups`)
      .query({ search: groupName, courseYear: 3 })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(groupsList.body).toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ id: group.id, studentCount: 2 })],
      }),
    );

    const updatedGroupResponse = await request(app.getHttpServer())
      .put(`/${API_PREFIX}/admin/groups/${group.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ direction: 'Обновлённое направление' })
      .expect(200);
    expect(updatedGroupResponse.body).toEqual(
      expect.objectContaining({ direction: 'Обновлённое направление' }),
    );

    await request(app.getHttpServer())
      .delete(
        `/${API_PREFIX}/admin/groups/${group.id}/students/${secondStudent.id}`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toEqual(expect.objectContaining({ studentCount: 1 }));
      });

    const createdDisciplineResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/disciplines`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: disciplineName,
        description: 'Дисциплина для проверки назначений',
      })
      .expect(201);
    const discipline = createdDisciplineResponse.body as DisciplineResponse;

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/disciplines`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: disciplineName })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/disciplines/${discipline.id}/teachers`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ teacherIds: [teacher.id] })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/disciplines/${discipline.id}/groups`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ groupIds: [group.id] })
      .expect(200);

    const assignmentResponse = await request(app.getHttpServer())
      .post(
        `/${API_PREFIX}/admin/disciplines/${discipline.id}/teaching-assignments`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ teacherId: teacher.id, groupId: group.id })
      .expect(201);
    const assignment = assignmentResponse.body as TeachingAssignmentResponse;
    expect(assignment).toEqual(
      expect.objectContaining({
        teacher: expect.objectContaining({ id: teacher.id }),
        group: expect.objectContaining({ id: group.id }),
      }),
    );

    await request(app.getHttpServer())
      .post(
        `/${API_PREFIX}/admin/disciplines/${discipline.id}/teaching-assignments`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ teacherId: teacher.id, groupId: group.id })
      .expect(409);

    const disciplineDetailResponse = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/disciplines/${discipline.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(disciplineDetailResponse.body).toEqual(
      expect.objectContaining({
        teacherCount: 1,
        groupCount: 1,
        teachingAssignmentCount: 1,
      }),
    );

    await request(app.getHttpServer())
      .delete(
        `/${API_PREFIX}/admin/disciplines/${discipline.id}/groups/${group.id}`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toEqual(
          expect.objectContaining({
            groupCount: 0,
            teachingAssignmentCount: 0,
          }),
        );
      });

    await request(app.getHttpServer())
      .post(
        `/${API_PREFIX}/admin/disciplines/${discipline.id}/teaching-assignments`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ teacherId: teacher.id, groupId: group.id })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/disciplines/${discipline.id}/groups`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ groupIds: [group.id] })
      .expect(200);

    const recreatedAssignmentResponse = await request(app.getHttpServer())
      .post(
        `/${API_PREFIX}/admin/disciplines/${discipline.id}/teaching-assignments`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ teacherId: teacher.id, groupId: group.id })
      .expect(201);
    const recreatedAssignment =
      recreatedAssignmentResponse.body as TeachingAssignmentResponse;

    await request(app.getHttpServer())
      .delete(
        `/${API_PREFIX}/admin/disciplines/${discipline.id}/teaching-assignments/${recreatedAssignment.id}`,
      )
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/admin/disciplines/${discipline.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const seededDisciplineList = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/disciplines`)
      .query({ search: 'Алгоритмы и структуры данных' })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const seededDisciplineId = (
      seededDisciplineList.body as { items: Array<{ id: number }> }
    ).items[0]?.id;
    expect(seededDisciplineId).toEqual(expect.any(Number));
    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/admin/disciplines/${seededDisciplineId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/admin/groups/${group.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
  });

  it('manages Markdown news drafts, publication and role visibility', async () => {
    const [admin, student, teacher] = await Promise.all([
      login('admin@demo.local'),
      login('student@demo.local'),
      login('teacher@demo.local'),
    ]);
    const title = `News lifecycle ${Date.now()}`;

    const createResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/news`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        title,
        bodyMarkdown: '# Заголовок\n\nТекст с **разметкой**.',
        targetRole: 'student',
      })
      .expect(201);
    const created = createResponse.body as NewsResponse;
    expect(created).toEqual(
      expect.objectContaining({
        title,
        status: 'draft',
        targetRole: 'student',
        publishedAt: null,
        bodyMarkdown: '# Заголовок\n\nТекст с **разметкой**.',
      }),
    );
    expect(created.excerpt).toContain('Заголовок');

    await request(app.getHttpServer())
      .get(`/${API_PREFIX}/news/${created.id}`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(404);

    const beforePublish = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/news`)
      .query({ search: title })
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200);
    expect((beforePublish.body as NewsListResponse).items).toHaveLength(0);

    const publishResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/news/${created.id}/publish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(publishResponse.body).toEqual(
      expect.objectContaining({
        status: 'published',
        publishedAt: expect.any(String),
      }),
    );

    const studentList = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/news`)
      .query({ search: title })
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200);
    const studentNews = (studentList.body as NewsListResponse).items;
    expect(studentNews).toHaveLength(1);
    expect(studentNews[0]).not.toHaveProperty('bodyMarkdown');

    await request(app.getHttpServer())
      .get(`/${API_PREFIX}/news/${created.id}`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toEqual(
          expect.objectContaining({
            id: created.id,
            bodyMarkdown: expect.any(String),
          }),
        );
      });

    await request(app.getHttpServer())
      .get(`/${API_PREFIX}/news/${created.id}`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(404);

    const adminDrafts = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/news`)
      .query({ status: 'published', search: title })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect((adminDrafts.body as NewsListResponse).items).toHaveLength(1);

    await request(app.getHttpServer())
      .put(`/${API_PREFIX}/admin/news/${created.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ unknownField: true })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/admin/news/${created.id}/unpublish`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toEqual(
          expect.objectContaining({ status: 'draft', publishedAt: null }),
        );
      });

    await request(app.getHttpServer())
      .get(`/${API_PREFIX}/news/${created.id}`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/admin/news/${created.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
  });

  it('prepares a course and overrides material availability for one group', async () => {
    const [teacher, student] = await Promise.all([
      login('teacher@demo.local'),
      login('student@demo.local'),
    ]);
    const overviewResponse = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/academic/overview`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);
    const overview = overviewResponse.body as TeacherAcademicOverview;
    const algorithms = overview.disciplines.find(
      ({ name }) => name === 'Алгоритмы и структуры данных',
    );
    const targetGroup = algorithms?.groups.find(
      ({ name }) => name === 'ИВТ-21',
    );
    expect(algorithms).toBeDefined();
    expect(targetGroup).toBeDefined();

    const createCourseResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/courses`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({
        disciplineId: algorithms?.id,
        title: `Подготовленный курс ${Date.now()}`,
        description: 'Курс создаётся заранее и публикуется позднее.',
      })
      .expect(201);
    const courseId = (createCourseResponse.body as { id: number }).id;
    expect(createCourseResponse.body).toEqual(
      expect.objectContaining({ status: 'draft' }),
    );

    const assignedResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/courses/${courseId}/groups`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ teachingAssignmentIds: [targetGroup?.teachingAssignmentId] })
      .expect(200);
    const assignedCourse = assignedResponse.body as CourseDetailResponse;
    const courseGroup = assignedCourse.courseGroups[0];
    expect(courseGroup.teachingAssignment.group.name).toBe('ИВТ-21');

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const materialResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/courses/${courseId}/materials`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({
        title: 'Материал с индивидуальной датой',
        type: 'link',
        url: 'https://example.com/material',
        defaultAvailableAt: futureDate.toISOString(),
      })
      .expect(201);
    const material =
      materialResponse.body as CourseDetailResponse['materials'][number];
    expect(material.releases[0]).toEqual(
      expect.objectContaining({
        courseGroupId: courseGroup.id,
        status: 'scheduled',
      }),
    );

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);

    const hiddenMaterialCourse = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/courses/${courseId}`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200);
    expect(
      (hiddenMaterialCourse.body as CourseDetailResponse).materials,
    ).toHaveLength(0);

    await request(app.getHttpServer())
      .put(
        `/${API_PREFIX}/courses/${courseId}/materials/${material.id}/groups/${courseGroup.id}/release`,
      )
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ action: 'publish_now' })
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toEqual(expect.objectContaining({ status: 'published' }));
      });

    await request(app.getHttpServer())
      .put(
        `/${API_PREFIX}/courses/${courseId}/materials/${material.id}/groups/${courseGroup.id}/release`,
      )
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ action: 'publish_now' })
      .expect(200);

    const visibleMaterialCourse = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/courses/${courseId}`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200);
    expect(
      (visibleMaterialCourse.body as CourseDetailResponse).materials,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: material.id,
          title: 'Материал с индивидуальной датой',
        }),
      ]),
    );

    const progress = await request(app.getHttpServer())
      .get(
        `/${API_PREFIX}/courses/${courseId}/groups/${courseGroup.id}/progress`,
      )
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);
    expect(progress.body).toEqual(
      expect.objectContaining({
        group: expect.objectContaining({ name: 'ИВТ-21' }),
        students: expect.arrayContaining([
          expect.objectContaining({ email: 'student@demo.local' }),
        ]),
      }),
    );

    const notificationsResponse = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/notifications`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200);
    const notifications = notificationsResponse.body as NotificationsResponse;
    const notification = notifications.items.find(
      ({ type, referenceId }) =>
        type === 'material_published' && referenceId === material.id,
    );
    expect(
      notifications.items.filter(
        ({ type, referenceId }) =>
          type === 'material_published' && referenceId === material.id,
      ),
    ).toHaveLength(1);
    expect(notification).toEqual(
      expect.objectContaining({
        title: 'Новый материал: Материал с индивидуальной датой',
        body: expect.stringContaining('Алгоритмы и структуры данных'),
        isRead: false,
      }),
    );

    await request(app.getHttpServer())
      .patch(`/${API_PREFIX}/notifications/${notification?.id}/read`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toEqual(expect.objectContaining({ isRead: true }));
      });
  });

  it('creates an academic-year run from a template and manages blocks and assignments', async () => {
    const [teacher, student] = await Promise.all([
      login('teacher@demo.local'),
      login('student@demo.local'),
    ]);
    const overviewResponse = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/academic/overview`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);
    const overview = overviewResponse.body as TeacherAcademicOverview;
    const algorithms = overview.disciplines.find(
      ({ name }) => name === 'Алгоритмы и структуры данных',
    );
    const targetGroup = algorithms?.groups.find(
      ({ name }) => name === 'ИВТ-21',
    );
    expect(algorithms).toBeDefined();
    expect(targetGroup).toBeDefined();

    await request(app.getHttpServer())
      .get(`/${API_PREFIX}/course-templates`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(403);

    const templateResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/course-templates`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({
        disciplineId: algorithms?.id,
        title: `Шаблон алгоритмов ${Date.now()}`,
        description: 'Переиспользуемый шаблон для нового набора.',
      })
      .expect(201);
    const template = templateResponse.body as CourseTemplateResponse;

    const blockResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/course-templates/${template.id}/blocks`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({
        title: 'Модуль 1',
        orderIndex: 10,
        content: { kind: 'rich-text', text: 'Введение' },
      })
      .expect(201);
    const block = blockResponse.body as { id: number };

    await request(app.getHttpServer())
      .put(`/${API_PREFIX}/course-templates/${template.id}/blocks/${block.id}`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ title: 'Модуль 1. Основы', orderIndex: 1 })
      .expect(200);

    const templateAssignmentResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/course-templates/${template.id}/assignments`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({
        blockId: block.id,
        title: 'Практика по алгоритмам',
        gradingType: 'scored',
        maxScore: 100,
        deadlineOffsetDays: 14,
        allowedExtensions: ['pdf'],
        maxAttempts: 5,
        maxFiles: 1,
        maxFileSizeBytes: 5 * 1024 * 1024,
        maxTotalSizeBytes: 5 * 1024 * 1024,
        allowLateSubmissions: false,
      })
      .expect(201);
    const templateAssignment =
      templateAssignmentResponse.body as CourseTemplateResponse['assignments'][number];

    await request(app.getHttpServer())
      .put(
        `/${API_PREFIX}/course-templates/${template.id}/assignments/${templateAssignment.id}`,
      )
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ description: 'Обновлённое описание задания.' })
      .expect(200);

    const startsAt = new Date('2098-09-01T09:00:00.000Z');
    const runResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/course-templates/${template.id}/runs`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({
        academicYear: '2098/2099',
        semester: 1,
        startsAt: startsAt.toISOString(),
        endsAt: '2099-01-20T09:00:00.000Z',
        teachingAssignmentIds: [targetGroup?.teachingAssignmentId],
      })
      .expect(201);
    const run = runResponse.body as {
      id: number;
      academicYear: string;
      templateVersion: number;
      blocks: Array<{ id: number; title: string }>;
      assignments: AssignmentResponse[];
    };
    expect(run).toEqual(
      expect.objectContaining({
        academicYear: '2098/2099',
        templateVersion: expect.any(Number),
      }),
    );
    expect(run.blocks).toEqual([
      expect.objectContaining({ title: 'Модуль 1. Основы' }),
    ]);
    expect(run.assignments).toHaveLength(1);
    const assignment = run.assignments[0];
    expect(assignment.deadline).toBe(
      new Date(startsAt.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    );
    expect(assignment).toEqual(
      expect.objectContaining({
        allowedExtensions: ['pdf'],
        maxAttempts: 5,
        maxFiles: 1,
        maxFileSizeBytes: 5 * 1024 * 1024,
        maxTotalSizeBytes: 5 * 1024 * 1024,
        allowLateSubmissions: false,
      }),
    );

    const extraBlockResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/courses/${run.id}/blocks`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ title: 'Дополнительный модуль', orderIndex: 2 })
      .expect(201);
    const extraBlock = extraBlockResponse.body as { id: number };
    await request(app.getHttpServer())
      .put(`/${API_PREFIX}/courses/${run.id}/blocks/${extraBlock.id}`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ title: 'Дополнительная практика' })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/courses/${run.id}/blocks/${extraBlock.id}`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/courses/${run.id}/publish`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);

    const hiddenAssignments = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/courses/${run.id}/assignments`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200);
    expect(hiddenAssignments.body).toEqual([]);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/assignments/${assignment.id}/publish`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);

    const visibleAssignments = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/courses/${run.id}/assignments`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .expect(200);
    expect(visibleAssignments.body).toEqual([
      expect.objectContaining({
        id: assignment.id,
        status: 'published',
        allowedExtensions: ['pdf'],
        maxAttempts: 5,
        maxFiles: 1,
      }),
    ]);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/assignments/${assignment.id}/close`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/assignments/${assignment.id}`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/courses/${run.id}/archive`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200)
      .expect(({ body }: Response) => {
        expect(body).toEqual(
          expect.objectContaining({
            status: 'archived',
            archivedAt: expect.any(String),
          }),
        );
      });
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/courses/${run.id}/blocks`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ title: 'Нельзя изменить архив', orderIndex: 99 })
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/course-templates/${template.id}`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/course-templates/${template.id}/runs`)
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ academicYear: '2099/2100' })
      .expect(409);
  });

  it('immediately rejects access and refresh tokens of an inactive user', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { domain: 'demo.local' },
    });
    const email = 'inactive-session-e2e@demo.local';
    const password = 'inactive-session-password';
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        fullName: 'Inactive Session Test',
        passwordHash: await bcrypt.hash(password, 12),
        role: UserRole.student,
      },
    });

    try {
      const loginResponse = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/login`)
        .send({ email, password })
        .expect(201);
      const accessToken = (loginResponse.body as TokenResponse).accessToken;
      const refreshCookie = getRefreshCookie(loginResponse);

      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      await request(app.getHttpServer())
        .get(`/${API_PREFIX}/users/me`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/refresh`)
        .set('Cookie', refreshCookie)
        .expect(401);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it('prevents cross-tenant and cross-account ID access', async () => {
    const suffix = Date.now().toString(36);
    const tenantDomain = `security-${suffix}.local`;
    const password = 'cross-tenant-password';
    const passwordHash = await bcrypt.hash(password, 12);
    const foreign = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: `Security tenant ${suffix}`, domain: tenantDomain },
      });
      const [admin, teacher, student] = await Promise.all([
        tx.user.create({
          data: {
            tenantId: tenant.id,
            email: `admin-${suffix}@security.local`,
            fullName: 'Foreign Admin',
            passwordHash,
            role: UserRole.admin,
          },
        }),
        tx.user.create({
          data: {
            tenantId: tenant.id,
            email: `teacher-${suffix}@security.local`,
            fullName: 'Foreign Teacher',
            passwordHash,
            role: UserRole.teacher,
          },
        }),
        tx.user.create({
          data: {
            tenantId: tenant.id,
            email: `student-${suffix}@security.local`,
            fullName: 'Foreign Student',
            passwordHash,
            role: UserRole.student,
          },
        }),
      ]);
      const group = await tx.group.create({
        data: { tenantId: tenant.id, name: `SEC-${suffix}` },
      });
      const discipline = await tx.discipline.create({
        data: { tenantId: tenant.id, name: `Security ${suffix}` },
      });
      await tx.userGroup.create({
        data: { userId: student.id, groupId: group.id },
      });
      await Promise.all([
        tx.disciplineTeacher.create({
          data: { disciplineId: discipline.id, userId: teacher.id },
        }),
        tx.disciplineGroup.create({
          data: { disciplineId: discipline.id, groupId: group.id },
        }),
      ]);
      const teachingAssignment = await tx.teachingAssignment.create({
        data: {
          disciplineId: discipline.id,
          teacherId: teacher.id,
          groupId: group.id,
        },
      });
      const course = await tx.course.create({
        data: {
          disciplineId: discipline.id,
          teacherId: teacher.id,
          title: `Foreign course ${suffix}`,
          status: CourseStatus.published,
        },
      });
      await tx.courseGroup.create({
        data: {
          courseId: course.id,
          teachingAssignmentId: teachingAssignment.id,
        },
      });
      const notification = await tx.notification.create({
        data: {
          userId: student.id,
          type: NotificationType.news_published,
          title: 'Foreign notification',
        },
      });
      return { tenant, admin, teacher, student, group, course, notification };
    });

    try {
      const [localAdmin, localTeacher, localStudent, foreignStudent] =
        await Promise.all([
          login('admin@demo.local'),
          login('teacher@demo.local'),
          login('student@demo.local'),
          request(app.getHttpServer())
            .post(`/${API_PREFIX}/auth/login`)
            .send({ email: foreign.student.email, password })
            .expect(201)
            .then((response) => response.body as TokenResponse),
        ]);

      await request(app.getHttpServer())
        .get(`/${API_PREFIX}/courses/${foreign.course.id}`)
        .set('Authorization', `Bearer ${foreignStudent.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/${API_PREFIX}/admin/users/${foreign.student.id}`)
        .set('Authorization', `Bearer ${localAdmin.accessToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/${API_PREFIX}/admin/groups/${foreign.group.id}`)
        .set('Authorization', `Bearer ${localAdmin.accessToken}`)
        .expect(404);

      for (const token of [
        localAdmin.accessToken,
        localTeacher.accessToken,
        localStudent.accessToken,
      ]) {
        await request(app.getHttpServer())
          .get(`/${API_PREFIX}/courses/${foreign.course.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      }

      await request(app.getHttpServer())
        .patch(`/${API_PREFIX}/notifications/${foreign.notification.id}/read`)
        .set('Authorization', `Bearer ${localStudent.accessToken}`)
        .expect(404);
    } finally {
      await prisma.discipline.deleteMany({
        where: { tenantId: foreign.tenant.id },
      });
      await prisma.tenant.delete({ where: { id: foreign.tenant.id } });
    }
  });

  it('rotates refresh tokens and revokes the active token on logout', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({
        email: 'student2@demo.local',
        password: 'demo123',
      })
      .expect(201);
    const originalCookie = getRefreshCookie(loginResponse);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .set('Cookie', originalCookie)
      .send({
        email: 'student2@demo.local',
        password: 'demo123',
      })
      .expect(403);

    const refreshResponse = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/refresh`)
      .set('Cookie', originalCookie)
      .expect(201);
    expect((refreshResponse.body as TokenResponse).accessToken).toEqual(
      expect.any(String),
    );
    const rotatedCookie = getRefreshCookie(refreshResponse);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/refresh`)
      .set('Cookie', originalCookie)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/logout`)
      .set('Cookie', rotatedCookie)
      .expect(201)
      .expect({ message: 'Logged out' });

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/refresh`)
      .set('Cookie', rotatedCookie)
      .expect(401);
  });

  it('reads and safely updates the current user profile', async () => {
    const email = 'profile-test@demo.local';
    const oldPassword = 'profile-password';
    const newPassword = 'new-profile-password';

    const registration = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .send({
        email,
        password: oldPassword,
        name: 'Profile Test',
      })
      .expect(201);
    const accessToken = (registration.body as TokenResponse).accessToken;
    const originalRefreshCookie = getRefreshCookie(registration);

    const profile = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profile.body).toEqual(
      expect.objectContaining({
        email,
        fullName: 'Profile Test',
        role: 'student',
        isActive: true,
      }),
    );
    expect(profile.body).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer())
      .put(`/${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'admin' })
      .expect(400);

    const updatedProfile = await request(app.getHttpServer())
      .put(`/${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Updated Profile',
        currentPassword: oldPassword,
        newPassword,
      })
      .expect(200);

    expect(updatedProfile.body).toEqual(
      expect.objectContaining({
        email,
        fullName: 'Updated Profile',
        role: 'student',
      }),
    );
    expect(updatedProfile.body).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/refresh`)
      .set('Cookie', originalRefreshCookie)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({ email, password: oldPassword })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({ email, password: newPassword })
      .expect(201);
  });

  async function login(email: string): Promise<TokenResponse> {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({ email, password: 'demo123' })
      .expect(201);

    return response.body as TokenResponse;
  }

  async function findAdminUser(
    accessToken: string,
    email: string,
  ): Promise<UserResponse> {
    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/users`)
      .query({ search: email, limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const users = (response.body as AdminUsersListResponse).items;
    const user = users.find((item) => item.email === email);
    if (!user) {
      throw new Error(`Seed user ${email} was not found`);
    }
    return user;
  }
});

function getRefreshCookie(response: Response): string {
  const cookies = response.headers['set-cookie'];
  if (!cookies?.[0]) {
    throw new Error('Response does not contain a refresh cookie');
  }

  return cookies[0].split(';', 1)[0];
}
