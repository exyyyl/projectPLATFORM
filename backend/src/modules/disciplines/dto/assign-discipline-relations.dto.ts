import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class AssignTeachersDto {
  @ApiProperty({ example: [2, 3], type: [Number], maxItems: 100 })
  @Type(() => Number)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  teacherIds: number[];
}

export class AssignGroupsDto {
  @ApiProperty({ example: [1, 2], type: [Number], maxItems: 100 })
  @Type(() => Number)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  groupIds: number[];
}
