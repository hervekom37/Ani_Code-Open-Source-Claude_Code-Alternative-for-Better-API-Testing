import { Agent } from './agent.js';
import dotenv from 'dotenv';

dotenv.config(); // Charge le fichier .env

async function test() {
  try {
    const agent = await Agent.create('openrouter/auto', 0.7);

    // Récupère la clé depuis la variable d'environnement
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('La clé API OpenRouter est introuvable dans les variables d’environnement.');
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
