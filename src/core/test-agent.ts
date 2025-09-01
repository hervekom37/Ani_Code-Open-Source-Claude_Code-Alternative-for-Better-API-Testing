import { Agent } from './agent.js';
import dotenv from 'dotenv';

dotenv.config(); // Load .env file

async function test() {
  try {
    const agent = await Agent.create('openrouter/auto', 0.7);

    // Get the key from the environment variable
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('OpenRouter API key not found in environment variables.');
    }

    agent.saveApiKey(apiKey);

    console.log('DEBUG: API Key set in Agent:', agent['apiKey']); // debug

    await agent.chat('Hello, is my API key working?');

    console.log('Conversation finished successfully!');
  } catch (e) {
    console.error('Error during test:', e);
  }
}

test();
