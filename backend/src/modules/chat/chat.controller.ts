import { Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('assignments')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':assignmentId/chat')
  listMessages(@Param('assignmentId') assignmentId: string) {
    return { message: `TODO: GET /assignments/${assignmentId}/chat` };
  }

  @Post(':assignmentId/chat')
  sendMessage(@Param('assignmentId') assignmentId: string) {
    return { message: `TODO: POST /assignments/${assignmentId}/chat` };
  }
}
