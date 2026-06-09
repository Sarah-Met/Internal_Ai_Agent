import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AppService {
  // Replace with your actual n8n Webhook URL from the node
  private n8nUrl = 'http://localhost:5678/webhook/ask-ai';

  async askAi(question: string) {
    try {
      // This sends the data to n8n, just like Postman did
      const response = await axios.post(this.n8nUrl, {
        question: question,
        sessionId: 'default-session'
      });

      // Return n8n's answer back to the frontend
      return response.data;
    } catch (error) {
      console.error('Error connecting to n8n:', error.message);
      if (error.response) {
        console.error('n8n response status:', error.response.status);
        console.error('n8n response data:', error.response.data);
        if (error.response.status === 500) {
          return { error: 'n8n workflow crashed during execution. This usually happens when the Hugging Face embedding API or the LLM provider rate-limits requests.' };
        }
      }
      return { error: 'Failed to reach n8n' };
    }

  }
}