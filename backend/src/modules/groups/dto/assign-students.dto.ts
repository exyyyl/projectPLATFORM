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

export class AssignStudentsDto {
  @ApiProperty({ example: [4, 5], type: [Number], maxItems: 500 })
  @Type(() => Number)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(1, { each: true })
  studentIds: number[];
}
