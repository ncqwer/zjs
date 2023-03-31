import { Command } from 'commander';
import { buildConfigCommand } from './config';
import { buildReplaceCommand } from './replace';

export const main = async () => {
  const program = new Command();
  const replaceCommand = buildReplaceCommand();
  const configCommand = buildConfigCommand();
  program.addCommand(replaceCommand).addCommand(configCommand);
  return program.parseAsync();
  // program.parse();
  // const  = program.opts();
};

export * from './execCommand';
