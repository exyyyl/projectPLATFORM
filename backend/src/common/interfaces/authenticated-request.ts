import { Request } from 'express';
import { JwtPayload } from '../decorators/current-user.decorator';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
