import { parse } from 'dotenv';

import { Command } from 'commander';
import { resolve, dirname } from 'path';
import {
  readFile,
  copyFile,
  writeFile,
  access,
  constants,
  mkdir,
} from 'fs/promises';
import prompts = require('prompts');
import { getEnvPath } from './getEnvPath';

export function buildConfigCommand() {
  const program = new Command('config');
  program
    .description(
      'init deploy-helper config and store it in ~/.config/deploy-helper/.env',
    )
    .option('-p, --path', 'output env file path', false)
    .option('-i, --interactive', 'enter interactive mode to add KV', false)
    .option(
      '--reset <env file>',
      'target directory that includes template files',
      false,
    )
    .action(async ({ interactive, reset: file, path: needOuptputPath }) => {
      let configure = {};
      const userEnvFilePath = getEnvPath();
      if (needOuptputPath) {
        // eslint-disable-next-line no-console
        console.log(userEnvFilePath);
        return;
      }
      if (!interactive && file) {
        await makesureDirExit();
        await copyFile(resolve(file), userEnvFilePath);
        return;
      }
      try {
        const envFileContent = await readFile(userEnvFilePath);
        const envConfig = parse(envFileContent);
        configure = { ...envConfig, ...configure };
      } catch {
        // do nothing
      }
      if (interactive) {
        let cancelFlag = false;
        while (!cancelFlag) {
          const { key, value, isContinue } = await prompts(
            [
              {
                type: 'text',
                name: 'key',
                message: 'Enter a new Key or overwride the target key:',
              },
              { type: 'text', name: 'value', message: 'Enter the value:' },
              {
                message: 'Would you like to continue?',
                type: 'toggle',
                name: 'isContinue',
                initial: true,
                active: 'yes',
                inactive: 'no',
              },
            ],
            {
              onCancel() {
                cancelFlag = true;
                return false;
              },
            },
          );
          if (cancelFlag) break;
          configure[key.toUpperCase()] = value;
          if (!isContinue) break;
        }
        if (cancelFlag) return;
        await makesureDirExit();
        await writeEnvFile();
      } else {
        const newContent = Object.entries(configure)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n\n');
        // eslint-disable-next-line no-console
        console.log(newContent);
        return;
      }

      async function writeEnvFile() {
        const newContent = Object.entries(configure)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join('\n\n');
        await writeFile(userEnvFilePath, newContent, { encoding: 'utf-8' });
      }

      async function makesureDirExit() {
        const dir = dirname(userEnvFilePath);
        try {
          await access(dir, constants.R_OK | constants.W_OK);
        } catch {
          await mkdir(dir, { recursive: true });
        }
      }
    });
  return program;
}

// function buildInitCommand() {}
