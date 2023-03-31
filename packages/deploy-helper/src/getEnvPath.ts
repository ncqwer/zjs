import { homedir } from 'os';
import { resolve } from 'path';

export const getEnvPath = () =>
  resolve(homedir(), '.config', 'deploy-helper', '.env');
