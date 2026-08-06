import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { API_PREFIX } from './../src/common/constants';

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

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
