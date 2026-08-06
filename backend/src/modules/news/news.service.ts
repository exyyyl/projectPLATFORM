import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsStatus, NewsTargetRole, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminNewsQueryDto,
  CreateNewsDto,
  NewsQueryDto,
  UpdateNewsDto,
} from './dto';

const authorSelect = { id: true, fullName: true } as const;

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  findPublished(tenantId: number, role: UserRole, query: NewsQueryDto) {
    return this.findPage(
      {
        tenantId,
        status: NewsStatus.published,
        publishedAt: { lte: new Date() },
        targetRole: {
          in: [NewsTargetRole.all, this.toNewsTargetRole(role)],
        },
        ...this.searchFilter(query.search),
      },
      query,
    );
  }

  async findPublishedOne(id: number, tenantId: number, role: UserRole) {
    const news = await this.prisma.news.findFirst({
      where: {
        id,
        tenantId,
        status: NewsStatus.published,
        publishedAt: { lte: new Date() },
        targetRole: {
          in: [NewsTargetRole.all, this.toNewsTargetRole(role)],
        },
      },
      include: { author: { select: authorSelect } },
    });
    if (!news) {
      throw new NotFoundException('News item not found');
    }
    return this.toDetail(news);
  }

  findAllForAdmin(tenantId: number, query: AdminNewsQueryDto) {
    return this.findPage(
      {
        tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.targetRole ? { targetRole: query.targetRole } : {}),
        ...this.searchFilter(query.search),
      },
      query,
    );
  }

  async findOneForAdmin(id: number, tenantId: number) {
    const news = await this.findTenantNews(id, tenantId);
    return this.toDetail(news);
  }

  async createForAdmin(
    tenantId: number,
    createdBy: number,
    dto: CreateNewsDto,
  ) {
    const news = await this.prisma.news.create({
      data: {
        tenantId,
        createdBy,
        title: dto.title,
        excerpt: dto.excerpt || null,
        bodyMarkdown: dto.bodyMarkdown,
        targetRole: dto.targetRole ?? NewsTargetRole.all,
      },
      include: { author: { select: authorSelect } },
    });
    return this.toDetail(news);
  }

  async updateForAdmin(id: number, tenantId: number, dto: UpdateNewsDto) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('No news changes provided');
    }
    await this.findTenantNews(id, tenantId);
    const news = await this.prisma.news.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt || null } : {}),
      },
      include: { author: { select: authorSelect } },
    });
    return this.toDetail(news);
  }

  async publish(id: number, tenantId: number) {
    const existing = await this.findTenantNews(id, tenantId);
    if (existing.status === NewsStatus.published) {
      return this.toDetail(existing);
    }
    const news = await this.prisma.news.update({
      where: { id },
      data: { status: NewsStatus.published, publishedAt: new Date() },
      include: { author: { select: authorSelect } },
    });
    return this.toDetail(news);
  }

  async unpublish(id: number, tenantId: number) {
    await this.findTenantNews(id, tenantId);
    const news = await this.prisma.news.update({
      where: { id },
      data: { status: NewsStatus.draft, publishedAt: null },
      include: { author: { select: authorSelect } },
    });
    return this.toDetail(news);
  }

  async remove(id: number, tenantId: number) {
    const news = await this.findTenantNews(id, tenantId);
    await this.prisma.news.delete({ where: { id } });
    return this.toDetail(news);
  }

  private async findPage(where: Prisma.NewsWhereInput, query: NewsQueryDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.news.findMany({
        where,
        include: { author: { select: authorSelect } },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.news.count({ where }),
    ]);
    return {
      items: items.map((news) => this.toSummary(news)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private findTenantNews(id: number, tenantId: number) {
    return this.prisma.news
      .findFirst({
        where: { id, tenantId },
        include: { author: { select: authorSelect } },
      })
      .then((news) => {
        if (!news) {
          throw new NotFoundException('News item not found');
        }
        return news;
      });
  }

  private searchFilter(search?: string): Prisma.NewsWhereInput {
    if (!search) {
      return {};
    }
    return {
      OR: [
        {
          title: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          excerpt: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    };
  }

  private toSummary<T extends NewsRecord>(news: T) {
    return {
      id: news.id,
      title: news.title,
      excerpt: news.excerpt || this.deriveExcerpt(news.bodyMarkdown),
      targetRole: news.targetRole,
      status: news.status,
      publishedAt: news.publishedAt,
      createdAt: news.createdAt,
      updatedAt: news.updatedAt,
      author: news.author,
    };
  }

  private toDetail<T extends NewsRecord>(news: T) {
    return { ...this.toSummary(news), bodyMarkdown: news.bodyMarkdown };
  }

  private deriveExcerpt(markdown: string): string {
    const plainText = markdown
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
      .replace(/[#>*_~-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plainText.length > 240
      ? `${plainText.slice(0, 237).trimEnd()}...`
      : plainText;
  }

  private toNewsTargetRole(role: UserRole): NewsTargetRole {
    return NewsTargetRole[role];
  }
}

interface NewsRecord {
  id: number;
  title: string;
  excerpt: string | null;
  bodyMarkdown: string;
  targetRole: NewsTargetRole;
  status: NewsStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: number; fullName: string };
}
