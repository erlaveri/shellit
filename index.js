const spawn = require('child_process').spawn;


function exec(cmd, options) {
  const child = spawn(cmd, {
    env: process.env,
    stdio: [process.stdin, 'pipe', 'pipe'],
    shell: true,
    ...options,
  });

  let stdout = '';
  let stderr = '';

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  child.stdout.on('data', chunk => stdout += chunk.toString());
  child.stderr.on('data', chunk => stderr += chunk.toString());

  const promise = new Promise(function (resolve, reject) {
    child.on('close', function (code, signal) {
      const data = { code, signal, stdout, stderr, child };
      code ?
        reject(data) :
        resolve(data);
    });
  });

  promise.child = child;

  return promise;
}

class Shellit {
  constructor(conf) {
    this.tasks = {};
    this.setUp(conf);
  }

  setUp(conf) {
    this.conf = conf;
  }

  task(name, callback) {
    this.tasks[name] = callback;
  }

  remote(cmd) {
    let c = `ssh -tt ${this.conf.user}@${this.conf.host} "${cmd}"`;
    return exec(c);
  }

  async start(...tasks) {
    for (let task of tasks) {
      const result = this.tasks[task]();
      if (result instanceof Promise) {
        await result;
      }
    }
  }
}

module.exports = Shellit;
