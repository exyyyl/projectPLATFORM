import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'student@demo.local', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'demo123', format: 'password' })
  @IsString()
  password: string;
}
