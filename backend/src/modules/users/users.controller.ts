import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiOkResponse({ description: 'Current user public profile' })
  @ApiUnauthorizedResponse({
    description: 'Access token or user account is unavailable',
  })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.findProfile(user.id, user.tenantId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update the current user profile or password' })
  @ApiOkResponse({ description: 'Updated user public profile' })
  @ApiBadRequestResponse({
    description: 'Invalid body, unknown fields or incomplete password pair',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token, account or current password is invalid',
  })
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, user.tenantId, dto);
  }
}
