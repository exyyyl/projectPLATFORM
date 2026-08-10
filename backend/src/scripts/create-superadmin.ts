import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import 'dotenv/config';
import { Pool } from 'pg';

interface Arguments {
  email: string;
  fullName: string;
  tenantDomain: string;
}

function readOption(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1]?.trim();
}

function requiredOption(name: string, environmentName: string): string {
  const value = readOption(name) || process.env[environmentName]?.trim();
  if (!value) {
    throw new Error(
      `Missing --${name}. It can also be provided through ${environmentName}.`,
    );
  }
  return value;
}

function parseArguments(): Arguments {
  const email = requiredOption('email', 'SUPERADMIN_EMAIL').toLowerCase();
  const fullName = requiredOption('name', 'SUPERADMIN_FULL_NAME');
  const tenantDomain = requiredOption(
    'tenant-domain',
    'SUPERADMIN_TENANT_DOMAIN',
  ).toLowerCase();

  if (!isEmail(email)) throw new Error('Superadmin email is invalid.');
  if (fullName.length < 2 || fullName.length > 200) {
    throw new Error('Superadmin name must contain from 2 to 200 characters.');
  }

  return { email, fullName, tenantDomain };
}

function readHiddenLine(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error(
      'An interactive terminal is required. For automation, provide SUPERADMIN_PASSWORD through a protected secret.',
    );
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const input = process.stdin;

    const restore = () => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') {
          restore();
          reject(new Error('Cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          restore();
          resolve(value);
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        value += character;
        process.stdout.write('*');
      }
    };

    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

async function getPassword(): Promise<string> {
  const environmentPassword = process.env.SUPERADMIN_PASSWORD;
  const password = environmentPassword ?? (await readHiddenLine('Password: '));
  if (!environmentPassword) {
    const confirmation = await readHiddenLine('Repeat password: ');
    if (confirmation !== password) throw new Error('Passwords do not match.');
  }
  if (password.length < 12) {
    throw new Error('Superadmin password must contain at least 12 characters.');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Superadmin password must not exceed 72 UTF-8 bytes.');
  }
  if (/^(demo123|password|admin|change-me)$/i.test(password)) {
    throw new Error('Choose a non-demo password.');
  }
  return password;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set.');

  const args = parseArguments();
  const password = await getPassword();
  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { domain: args.tenantDomain },
      select: { id: true, name: true, isActive: true },
    });
    if (!tenant || !tenant.isActive) {
      throw new Error('The selected tenant does not exist or is inactive.');
    }

    const existing = await prisma.user.findFirst({
      where: { email: args.email },
      select: { id: true },
    });
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: args.email,
        fullName: args.fullName,
        passwordHash: await bcrypt.hash(password, 12),
        role: UserRole.superadmin,
      },
      select: { id: true, email: true, fullName: true, role: true },
    });

    process.stdout.write(
      `Superadmin created: ${user.email} (id=${user.id}, home tenant=${tenant.name})\n`,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new Error('A user with this email already exists.');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Could not create superadmin: ${message}\n`);
  process.exitCode = 1;
});
