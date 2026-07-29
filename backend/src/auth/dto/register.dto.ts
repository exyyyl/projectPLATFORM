import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'new-student@example.com', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    format: 'password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Новый студент' })
  @IsString()
  @IsOptional()
  name?: string;
}
