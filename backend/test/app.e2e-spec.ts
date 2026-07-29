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

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'admin@demo.local', role: 'admin' }),
      ]),
    );
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
});

function getRefreshCookie(response: Response): string {
  const cookies = response.headers['set-cookie'];
  if (!cookies?.[0]) {
    throw new Error('Response does not contain a refresh cookie');
  }

  return cookies[0].split(';', 1)[0];
}
