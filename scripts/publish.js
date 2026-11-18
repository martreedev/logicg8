// Builds the Windows installer and publishes it to GitHub Releases.
//
// electron-builder's own GitHub publisher created duplicate releases when the
// installer and latest.yml were uploaded at the same time, so the release is
// created here explicitly with the GitHub CLI instead.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const tag = `v${version}`;

function abort(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
  if (result.error) {
    abort(result.error.message);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  return result;
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

run('gh', ['auth', 'status'], { stdio: 'ignore' });

const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
if (status.status !== 0) {
  abort('Could not read the git status.');
}
if (status.stdout.trim()) {
  abort('Commit your changes before publishing:\n' + status.stdout.trim());
}

const localTag = spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tag}`], {
  cwd: root,
  stdio: 'ignore'
});
if (localTag.status !== 0) {
  abort(`Tag ${tag} does not exist. Bump the version, commit, then tag it:\n  git tag ${tag}`);
}

const remoteTag = spawnSync('git', ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`], {
  cwd: root,
  stdio: 'ignore'
});
if (remoteTag.status !== 0) {
  abort(`Tag ${tag} is not on GitHub yet. Push it first:\n  git push origin ${tag}`);
}

const existingRelease = spawnSync('gh', ['release', 'view', tag, '--json', 'tagName'], {
  cwd: root,
  stdio: 'ignore'
});
if (existingRelease.status === 0) {
  abort(`Release ${tag} already exists. Bump the version in package.json before publishing again.`);
}

run(npm, ['run', 'dist']);

const artifacts = [
  `dist/LogicG8-Setup-${version}.exe`,
  `dist/LogicG8-Setup-${version}.exe.blockmap`,
  'dist/latest.yml'
];

for (const artifact of artifacts) {
  if (!fs.existsSync(path.join(root, artifact))) {
    abort(`The build did not produce ${artifact}.`);
  }
}

run('gh', ['release', 'create', tag, '--title', version, '--generate-notes', ...artifacts]);

console.log(`\nPublished ${tag} with the installer, latest.yml, and blockmap.`);
