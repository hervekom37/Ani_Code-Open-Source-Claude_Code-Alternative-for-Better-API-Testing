import fs from 'fs';
import path from 'path';

const ENV_PATH = path.resolve(process.cwd(), '.env');

export function saveEnvVariable(key: string, value: string) {
  let envData = '';
  if (fs.existsSync(ENV_PATH)) {
    envData = fs.readFileSync(ENV_PATH, 'utf8');
  }

  const envLines = envData.split('\n').filter(Boolean);
  const existingIndex = envLines.findIndex(line => line.startsWith(`${key}=`));

  if (existingIndex >= 0) {
    envLines[existingIndex] = `${key}=${value}`;
  } else {
    envLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(ENV_PATH, envLines.join('\n'));
}

export function getEnvVariable(key: string): string | undefined {
  if (!fs.existsSync(ENV_PATH)) return undefined;

  const envData = fs.readFileSync(ENV_PATH, 'utf8');
  const line = envData.split('\n').find(line => line.startsWith(`${key}=`));
  return line ? line.split('=')[1] : undefined;
}
