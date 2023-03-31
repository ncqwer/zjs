import { parse } from 'dotenv';

import { Command, InvalidArgumentError } from 'commander';
import { resolve, extname } from 'path';
import { readFile, writeFile, readdir } from 'fs/promises';
import getPort = require('get-port');
import { getEnvPath } from './getEnvPath';

const FILECONTENTREG = /\$\$(\S+?)\$\$/g;

export function buildReplaceCommand() {
  const program = new Command('replace');
  program
    .description(
      'replace template strings in the contents of files in the designated folder',
    )
    .option('--ext', 'file extension', 'y(a)?ml|txt|png')
    .option(
      '-d, --dir <targetDir>',
      'target directory that includes template files',
      '.',
    )
    .option(
      '--port',
      'attempt to query an available port number and inject it into a variable',
      false,
    )
    .option(
      '--exclude',
      'exlucude dir and file using regexp',
      '/((node_modules)|(.vscode)|(.github)|(.DS_Store)|(.cloudbase)|(log)|(logs))(/|$)',
    )
    .option('--debug', 'output debug info', false)
    .option(
      '-c, --configure <K=V>',
      'configure extra key value pairs',
      (curr, acc) => {
        const ans = /^(\S+)=(\S+)$/.exec(curr);
        if (!ans) throw new InvalidArgumentError('Invalid KV input');
        return { ...acc, [ans[1]]: ans[2] };
      },
      {} as Record<string, string>,
    )
    .action(
      async ({ dir, configure: _configure, ext, exclude, port, debug }) => {
        // return;
        const extReg = new RegExp(ext);
        const excludeReg = new RegExp(exclude);
        let configure = _configure;
        if (port) {
          try {
            const freePort = await (getPort as any)();
            configure = { ...configure, FREE_PORT: freePort };
          } catch (e) {
            throw new Error("Can't find free port!!!");
          }
        }
        try {
          const userEnvFilePath = getEnvPath();
          const envFileContent = await readFile(userEnvFilePath);
          const envConfig = parse(envFileContent);
          configure = { ...envConfig, ...configure };
        } catch {
          if (debug)
            // eslint-disable-next-line no-console
            console.log(
              'The current user has not configured the corresponding env file or there is an error with the format of the env file.Please use dph init to fix it',
            );
        }

        // eslint-disable-next-line no-console
        if (debug) console.table(configure);

        await replaceDir(resolve(dir));

        async function replaceDir(dirPath: string) {
          const dirs = await readdir(dirPath, {
            withFileTypes: true,
          });

          await Promise.all(
            dirs.map((dir) => {
              const path = resolve(dirPath, dir.name);
              if (excludeReg.test(path)) return;
              if (dir.isDirectory()) return replaceDir(path);
              if (dir.isFile()) return replaceFileContent(path);
            }),
          );
        }

        async function replaceFileContent(filePath: string) {
          if (!extReg.test(extname(filePath))) return;
          const content = await readFile(filePath, { encoding: 'utf-8' });
          const newContent = content.replace(FILECONTENTREG, (raw, key) => {
            const v = configure[key];
            return v || raw;
          });
          await writeFile(filePath, newContent, { encoding: 'utf-8' });
        }
      },
    );
  return program;
}

// function buildInitCommand() {}
