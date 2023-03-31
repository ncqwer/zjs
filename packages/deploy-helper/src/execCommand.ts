import { spawn } from 'child_process';

export async function execCommand(
  commands: string,
  // eslint-disable-next-line no-console
  onData: ((v: string) => void) | null = console.log.bind(console),
) {
  const childProcess = spawn('zsh', ['-c', commands]);
  let ans = '';
  childProcess.stdout?.on('data', (chunk) => {
    const str = chunk.toString();
    if (onData) onData(str);
    ans += str;
  });
  childProcess.stderr?.on('data', (_error) => {
    if (_error) {
      const error = _error.toString();
      const str = `child process[${commands}] error:\n${error.toString()}`;
      if (onData) onData(str);
      ans += str;
    }
  });
  let handler: ((v: { code: number | null; out: string }) => void) | null =
    null;
  childProcess.on('close', (code) => {
    if (handler) {
      handler({
        code,
        out: ans,
      });
      handler = null;
    }
  });

  return new Promise<{ out: string; code: number | null }>((res) => {
    handler = res;
  });
}
