import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateTeachingAssignmentDto {
  @ApiProperty({ example: 2, description: 'Active user with teacher role' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacherId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  groupId: number;
}
