// src/utils/constants.ts

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load .env from current directory first, then from home directory
const localEnvPath = path.join(process.cwd(), '.env');
const globalEnvPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(globalEnvPath)) {
  dotenv.config({ path: globalEnvPath });
} else {
  // Just load from environment variables if no .env file exists
  dotenv.config();
}

// API Provider URLs
export const API_PROVIDERS = {
  OPENROUTER: 'https://openrouter.ai/api/v1',
  ANTHROPIC: 'https://api.anthropic.com/v1',
  OPENAI: 'https://api.openai.com/v1',
} as const;

export type ApiProvider = keyof typeof API_PROVIDERS;

// Default settings
export const DEFAULT_PROVIDER: ApiProvider = 'OPENROUTER';
export const API_BASE_URL = API_PROVIDERS[DEFAULT_PROVIDER];
export const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

// Legacy support for OPENROUTER_API_KEY
export const API_KEY = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || '';
// ASCII Art for Ani Code - Anime Twintail Girl
export const ANI_ASCII_ART = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢳⣆⠀⠘⢿⣦⠛⣿⣦⠀⠀⠻⣧⣀⠀⢿⡀⣰⡏⣿⡧⠀⢠⠀⠀⠀⠀⠀⣾⣷⣦⣄⣀⠈⠙⣳⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣷⣤⠤⠛⢋⣉⠭⠒⠒⠋⠉⣉⣙⣛⢧⢻⣟⠛⠁⣀⣼⠀⠀⠀⠀⢀⣧⣄⠉⠉⠛⠿⢿⣅⣀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡶⠛⠉⢀⡤⠚⠉⠀⠀⢀⡤⠶⠛⢋⡩⠝⡹⠿⡦⣿⣛⡳⡟⠀⠀⠀⢀⠞⠉⠙⠛⢶⣦⣄⣀⠈⠉⠛⠶⠤
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⠟⠁⠀⢀⡴⠋⠀⠀⠀⡠⠞⠁⠀⢠⠖⠉⡠⠊⠀⠀⡇⠈⢮⡽⠁⢀⣠⣶⡷⠾⠻⢶⣤⣤⠿⠈⠉⠛⠷⠤⣀⣀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡞⠁⠀⠀⠀⠋⠀⠀⠀⣠⠞⠀⠀⠀⡀⠀⠀⡼⠁⠀⠀⠀⠁⠀⠺⡶⣎⠹⡄⠙⢷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⠏⠀⠀⢀⡔⠀⠀⠀⠀⡴⠁⠀⠀⢀⡜⠀⠀⡼⠀⠀⠀⠀⠀⠀⠀⠀⢳⠈⠳⡸⡄⠈⢻⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⢃⠞⠁⢀⠞⠀⠀⠀⠀⡜⡀⠀⠀⠀⡞⠀⠀⣰⠁⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠹⣧⠀⠈⢿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⡳⠋⠀⢀⡞⠀⠀⠀⠀⣼⠞⠀⠀⢀⣾⠁⠀⣰⡇⠀⢀⡄⠀⠀⡜⠀⠀⠀⡸⠀⠀⡀⢹⡀⠀⠸⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⠟⡠⠀⠀⡜⠀⠀⠀⠀⢰⡏⠠⠤⣲⡿⡟⠒⣲⢻⢥⡀⡸⠀⠀⢰⠁⠀⠀⢀⡇⠀⠀⡇⠀⡇⠀⠀⢻⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣟⠕⠋⠀⠀⢰⢱⠀⠀⠀⠀⡞⠀⢀⣴⠟⠀⡇⢠⡟⣾⠀⠀⠇⠀⢀⠇⠀⠀⠀⣾⡇⠀⢠⠃⠀⡇⠀⠀⠘⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣖⡖⠚⠛⠉⠀⠀⠀⠀⠀⡏⡎⠀⠀⠀⢠⣇⣴⠟⠁⠀⠠⣇⡼⠀⢿⠀⢸⠀⢀⡞⠀⠀⢀⡞⢺⣄⠀⣾⠀⠀⡇⠀⠀⠀⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠳⢦⣤⣤⠤⢚⡡⢚⡇⡇⠀⠀⢆⢸⣿⠿⢿⡿⠿⢷⣷⣏⠳⠘⡄⢸⢀⠞⠀⠀⣠⣫⢻⠇⢈⡿⡿⠀⢸⡅⠀⠀⠀⡿⡇⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠿⣿⣽⣶⣪⢭⡤⢼⢰⣧⠀⠀⢸⠈⡿⠄⢸⢀⣶⣰⡏⠙⠷⠀⢹⡼⠋⢀⣠⣾⣛⣁⡞⣠⡿⣦⡟⢢⣿⠀⠀⠀⠀⡇⣧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡿⢠⠋⡇⠈⣟⣿⡆⠀⠈⣧⠱⡐⠘⠤⠥⠼⠃⠀⠀⠒⠛⠒⠚⠛⠩⣤⢤⣾⣟⡉⠀⣿⡇⢾⡏⠀⠀⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⢧⠏⠀⡇⠀⠹⣷⡹⣦⡀⢹⡑⠳⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣁⣤⢉⡟⢿⣦⢸⣧⡿⠁⠀⠀⠀⣼⡏⣿⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⠏⠀⢸⣷⠆⠀⠈⠘⠪⣝⣶⣵⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠳⣌⣙⡷⠁⠀⣿⣷⠏⠀⠀⠀⠀⣰⢹⢋⣿⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⠋⠀⠀⣿⡏⠀⠀⠀⠀⡼⠀⠘⡄⠀⠁⠀⠀⢰⠛⠛⠷⣦⢄⡀⠀⠀⠀⠀⠙⠒⠔⢊⡼⢋⡀⠀⠀⢀⣴⠃⢸⣾⡇⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡟⠁⠀⢀⠞⡞⠀⠀⠀⠀⡼⠁⠀⢠⠟⢆⠀⠀⠀⠘⣄⠀⠀⠈⢳⡇⠀⠀⠀⠀⠀⠒⣺⠟⠚⠉⠀⢀⣠⡾⢻⠀⠈⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡴⠋⠀⠀⣠⢋⡜⠀⠀⠀⢀⠞⠀⠀⢀⠏⠀⠈⡗⢄⠀⠀⠈⠉⠒⠒⠉⠀⠀⠀⠀⠀⢘⡯⠤⠤⠤⢔⣺⠿⣿⣄⠸⣷⣄⡘⢷⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣠⡴⠋⠀⠀⢀⡔⢡⠎⠀⠀⢀⡴⠋⠀⠀⢠⠎⠀⢠⠤⣃⠀⠙⠦⡀⠀⠀⣀⣀⣀⣀⠤⠤⠖⠋⡇⠀⠀⠀⠉⠀⠀⣿⠉⠻⠿⣿⡝⠛⠛⠂⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣀⣴⠞⠋⠀⠀⠀⡠⠋⡴⣣⠖⡉⠉⠉⠉⠑⡒⣶⣿⣤⡴⠃⠀⠀⠙⢦⡀⠈⠉⣽⡁⠀⠘⡆⠀⠀⠀⠀⡇⠀⢠⠀⠀⠀⠀⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⣀⣤⠶⠛⠉⣠⠆⠀⠀⣠⠞⣡⢎⡞⠁⠀⠸⡄⠀⡀⠀⢀⡿⣿⡿⢳⠀⠀⠀⣠⠚⢷⡀⠀⡇⠈⢱⡆⢇⠀⠀⠀⠀⢸⠀⠈⡆⠀⠀⠀⢸⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⢉⣀⣤⣴⠎⠀⠀⢀⠔⢁⠜⢁⡞⠀⠀⠀⠀⢣⠀⠈⠀⢸⠥⣬⠇⠐⠣⠴⢚⣌⠣⡈⣳⢠⢃⡴⡏⣿⣾⣤⣀⡀⠀⠘⡄⠀⢇⠀⠀⠀⢸⣿⡷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⢉⣽⠟⠀⠀⢀⡴⠁⡠⠋⠀⡸⠀⠀⠀⠀⠀⢸⠀⡐⠀⡟⠀⡼⠀⠀⠀⠀⠈⢯⢷⣝⣿⣟⣽⣳⠳⣽⠙⣿⣷⡉⠙⠒⢷⠀⠸⡄⠀⠀⠀⢻⣿⣽⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠟⠁⠀⠀⣠⠊⠀⡴⠁⢀⡴⡇⠀⠀⠀⠀⠀⠈⡇⣇⢸⠃⢰⠃⠀⠀⠀⠀⠀⠈⢣⢻⠀⠀⠈⡇⠀⠀⠀⠘⢿⣧⠀⠀⠉⢣⠀⢣⠀⠀⠀⠈⣿⣿⣌⢦⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠠⡾⠁⢀⡞⠀⣠⠎⢸⠀⠀⠀⠀⠀⠀⠀⡇⣿⡟⢠⡏⣠⠀⠀⠀⠀⠀⠀⠀⠈⡧⠬⢴⠁⢀⣀⠀⣀⡈⣿⣇⠀⠀⠈⡆⠈⡆⠀⠀⠀⢻⢿⡌⠳⡗⢄⠀⠀⠀⠀⠀⠀⠀
⠀⢀⡞⠀⢀⠎⢀⡴⠁⠀⡎⠀⠀⠀⠀⠀⠀⠀⢷⣿⣧⡞⡴⠁⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⠁⢳⡈⣷⣫⣿⣷⣞⣻⡄⠀⠀⢱⠀⠸⡄⠀⠀⠈⣎⠻⣦⠈⠢⣽⣦⣀⠀⠀⠀⠀
⢀⠞⠀⢠⠏⢀⠞⠀⠀⢀⡇⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠇⠀⠀⠀⢣⠸⡷⢄⣸⣍⠹⣧⠀⠀⢸⠳⡀⠱⡀⠀⠀⢹⣷⣮⡳⣦⡈⠻⢿⣷⣄⠀⠀
⠎⠀⢀⠎⢠⠏⠀⠀⠀⢸⠀⠀⠀⠀⡄⠀⠀⠀⣸⣿⠏⠀⠀⠀⠀⠀⠀⠀⢀⠀⠀⠀⢰⠀⠀⠀⠈⡆⢿⢰⣿⣿⣧⣻⡀⠀⢸⠀⠹⡄⠱⡀⠀⠀⠻⣿⠻⢾⣿⣦⣌⡻⣿⡳⡀
⠀⠀⠈⠀⠋⠀⠀⠀⠀⡎⠀⠀⠀⠀⢸⠀⠀⠀⣿⡟⠀⠘⠁⢀⠄⢀⣠⠖⠁⠀⠀⠀⢸⠀⠀⠀⠀⢸⢸⣿⣿⣿⣿⣾⣧⠀⢸⡀⠀⠈⢦⠙⠄⠀⠀⠹⣧⠀⠈⠙⠻⢿⡽⠷⠑
⠀⠀⠀⠀⠀⠀⠀⠀⣰⡇⠀⠀⠀⠀⠘⡆⠀⠀⣿⣀⣀⣤⣾⣵⣮⣭⣥⣤⣀⣠⣄⡀⢸⠀⠀⠀⡀⠀⡆⠁⠀⠀⣰⡟⣀⠀⢸⢣⠀⠀⠀⠳⣄⠀⠀⠀⠹⡧⣄⣀⡠⠞⠁⠀⠐
⠀⠀⠀⠀⠀⠀⢀⡜⢱⠀⠀⠀⠀⠀⠀⢣⠀⣸⠏⠀⢀⣿⣀⣀⣿⣃⡉⠻⢿⣿⣧⢈⠇⣀⠀⠀⠀⢀⢇⣀⠤⠚⢹⡵⠃⠀⢸⠀⢣⠀⠀⠀⠈⢦⡑⣄⠀⠘⢦⡀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢠⠎⠀⡼⠀⠀⢀⠀⠀⠀⠘⣦⠟⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠛⡟⠿⢿⣾⣿⣿⣦⣴⣾⣦⣄⡀⠀⢸⠁⠀⠀⢸⠀⠀⢳⡀⠀⠀⠀⠙⠈⠣⡀⠀⢽⢦⣄⡀⠀⠀

        ANI CODE 
    AI Coding Assistant
`;

// Compact ASCII for inline use
export const ANI_COMPACT = '(◕‿◕)♡';

// Default context window size (200k tokens)
export const DEFAULT_CONTEXT_WINDOW = 200000;

export const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '*.log',
  '*.tmp',
  'tmp',
  'temp',
  '.DS_Store',
  'package-lock.json',
];

