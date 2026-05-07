import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
    async processMessage(message: string) {
        // TODO: Connect to n8n here
        return {
            reply: `Echo: ${message}`,
            timestamp: new Date().toISOString(),
        };
    }
}
