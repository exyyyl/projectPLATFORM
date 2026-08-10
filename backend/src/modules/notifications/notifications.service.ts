import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number) {
    const [items, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(notificationId: number, userId: number) {
    const updated = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    if (updated.count !== 1) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
  }

  async notifyMaterialPublished(materialReleaseId: number): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const release = await tx.materialRelease.findUnique({
        where: { id: materialReleaseId },
        include: {
          material: {
            include: {
              course: {
                include: {
                  discipline: true,
                  teacher: { select: { id: true, fullName: true } },
                },
              },
            },
          },
          courseGroup: {
            include: { teachingAssignment: { include: { group: true } } },
          },
        },
      });
      if (!release || release.notifiedAt) {
        return 0;
      }

      const claimed = await tx.materialRelease.updateMany({
        where: { id: release.id, notifiedAt: null },
        data: { notifiedAt: new Date() },
      });
      if (claimed.count !== 1) {
        return 0;
      }

      const group = release.courseGroup.teachingAssignment.group;
      const students = await tx.user.findMany({
        where: {
          role: UserRole.student,
          isActive: true,
          userGroups: { some: { groupId: group.id } },
        },
        select: { id: true },
      });
      if (students.length === 0) {
        return 0;
      }

      const course = release.material.course;
      const data: Prisma.InputJsonValue = {
        materialId: release.material.id,
        courseId: course.id,
        disciplineId: course.disciplineId,
        teacherId: course.teacherId,
        groupId: group.id,
      };
      const created = await tx.notification.createMany({
        data: students.map((student) => ({
          userId: student.id,
          type: NotificationType.material_published,
          referenceId: release.material.id,
          referenceType: 'Material',
          title: `Новый материал: ${release.material.title}`,
          body: `${course.teacher.fullName} · ${course.discipline.name} · ${group.name}`,
          data,
        })),
      });
      return created.count;
    });
  }
}
