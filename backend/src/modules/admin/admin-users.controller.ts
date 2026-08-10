import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AdminUserResponseDto,
  AdminUsersPageResponseDto,
  AdminUsersQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from '../users/dto';
import { UsersService } from '../users/users.service';

/**
 * Админ-панель: управление пользователями.
 * URL всегда с префиксом /admin/ — только для роли admin (после включения JWT).
 */
@Roles(UserRole.admin)
@ApiTags('admin/users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Access token is missing or invalid',
})
@ApiForbiddenResponse({ description: 'Admin role is required' })
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter users in the admin tenant' })
  @ApiOkResponse({
    description: 'Paginated users from the current tenant',
    type: AdminUsersPageResponseDto,
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: AdminUsersQueryDto) {
    return this.usersService.findAll(user.tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user in the admin tenant' })
  @ApiCreatedResponse({
    description: 'User created',
    type: AdminUserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Email already exists in the tenant' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAdminUserDto) {
    return this.usersService.createForAdmin(user.tenantId, user.role, dto);
  }

  @Post('import')
  importUsers() {
    return { message: 'TODO: POST /admin/users/import' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one user from the admin tenant' })
  @ApiOkResponse({ description: 'User found', type: AdminUserResponseDto })
  @ApiNotFoundResponse({ description: 'User does not exist in this tenant' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOneForAdmin(id, user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user in the admin tenant' })
  @ApiOkResponse({ description: 'User updated', type: AdminUserResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid body or an attempt to lock the current admin out',
  })
  @ApiNotFoundResponse({ description: 'User does not exist in this tenant' })
  @ApiConflictResponse({ description: 'Email already exists in the tenant' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.usersService.updateForAdmin(
      id,
      user.tenantId,
      user.id,
      user.role,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a user and revoke refresh sessions' })
  @ApiOkResponse({
    description: 'User deactivated',
    type: AdminUserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The current admin cannot deactivate their own account',
  })
  @ApiNotFoundResponse({ description: 'User does not exist in this tenant' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.deactivateForAdmin(
      id,
      user.tenantId,
      user.id,
      user.role,
    );
  }
}
