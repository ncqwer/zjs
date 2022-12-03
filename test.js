const fsp = require('fs/promises');
const child_process = require('child_process');

const main = async () => {
  try {
    const options = {
      silent: true,
    };
    options.listeners = {
      stdout: (data) => {},
      stderr: (data) => {},
    };
    console.log(`::debug::pwd is ${process.cwd()}`);
    await new Promise((res) =>
      child_process
        .spawn(
          'yarn',
          [
            'jest',
            '--json',
            '--outputFile=test.result.json',
            '--testLocationInResults',
          ],
          options,
        )
        .on('close', (code) => {
          res();
        })
        .on('error', () => {
          res();
        })
        .on('exit', () => {
          res();
        }),
    );
    const contentRaw = await fsp.readFile('test.result.json', {
      encoding: 'utf-8',
    });
    const content = JSON.parse(contentRaw);
    console.log(`::set-ouput name=pass::${content.success}`);
    console.log(`::set-ouput name=result::${JSON.stringify(content)}`);
    // return content;
  } catch (e) {
    console.log(`::error title=test failed`);
  }
};

main();
