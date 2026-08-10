import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app.module';
import { API_PREFIX } from './constants';

describe('API route documentation', () => {
  it('lists every controller route in API_ROUTE_MATRIX.md', async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(API_PREFIX, {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('route audit').build(),
    );
    const matrix = readFileSync(
      join(process.cwd(), 'API_ROUTE_MATRIX.md'),
      'utf8',
    );
    const reference = readFileSync(
      join(process.cwd(), 'API_REFERENCE.md'),
      'utf8',
    );
    const undocumented: string[] = [];
    const missingDetailedContract: string[] = [];

    for (const [path, operations] of Object.entries(document.paths)) {
      for (const method of Object.keys(operations ?? {})) {
        const documentedPath = path.replace(/\{([^}]+)\}/g, ':$1');
        const route = `${method.toUpperCase()} ${documentedPath}`;
        if (!matrix.includes(`\`${route}\``)) undocumented.push(route);
        const isStub = matrix.includes(`| \`${route}\` | TODO stub |`);
        const referenceContainsRoute =
          reference.includes(`\`${route}\``) ||
          reference.includes(`${method.toUpperCase()} \`${documentedPath}\``);
        if (!isStub && !referenceContainsRoute) {
          missingDetailedContract.push(route);
        }
      }
    }

    await app.close();
    expect(undocumented).toEqual([]);
    expect(missingDetailedContract).toEqual([]);
  });
});
