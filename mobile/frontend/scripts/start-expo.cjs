#!/usr/bin/env node

const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_PORT = Number(process.env.EXPO_START_PORT || 8081);
const PORT_SCAN_LIMIT = 20;
const userArgs = process.argv.slice(2);

const hasFlag = (...flags) =>
  userArgs.some((arg, index) => flags.includes(arg) || flags.some((flag) => arg.startsWith(`${flag}=`)));

const hasPortFlag = () => userArgs.some((arg) => arg === '--port' || arg === '-p' || arg.startsWith('--port=') || arg.startsWith('-p='));

const getFlagValue = (...flags) => {
  for (let index = 0; index < userArgs.length; index += 1) {
    const arg = userArgs[index];
    if (flags.includes(arg)) return userArgs[index + 1];

    for (const flag of flags) {
      if (arg.startsWith(`${flag}=`)) return arg.slice(flag.length + 1);
    }
  }

  return undefined;
};

const getRequestedPort = () => {
  const value = getFlagValue('--port', '-p');
  if (!value) return undefined;

  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : undefined;
};

const isPortFree = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });

const findFreePort = async (startPort) => {
  for (let port = startPort; port < startPort + PORT_SCAN_LIMIT; port += 1) {
    if (await isPortFree(port)) return port;
  }

  throw new Error(`No free Expo port found from ${startPort} to ${startPort + PORT_SCAN_LIMIT - 1}.`);
};

const getLanAddress = () => {
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.')) {
        return address.address;
      }
    }
  }

  return undefined;
};

const getAdbCandidates = () => {
  const candidates = [];

  if (process.env.ADB) candidates.push(process.env.ADB);
  if (process.env.ANDROID_HOME) candidates.push(path.join(process.env.ANDROID_HOME, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'));
  if (process.env.ANDROID_SDK_ROOT) candidates.push(path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'));
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe'));
  }
  candidates.push('adb');

  return [...new Set(candidates)];
};

const findAdb = () =>
  getAdbCandidates().find((candidate) => {
    const result = spawnSync(candidate, ['version'], { stdio: 'ignore' });
    return result.status === 0;
  });

const getConnectedAndroidDevices = (adbPath) => {
  if (!adbPath) return [];

  const result = spawnSync(adbPath, ['devices'], { encoding: 'utf8' });
  if (result.status !== 0) return [];

  return result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === 'device')
    .map(([serial]) => serial);
};

const reversePortForDevices = (adbPath, devices, port) => {
  if (!adbPath || devices.length === 0 || !port) return false;

  let reversed = false;
  for (const serial of devices) {
    const result = spawnSync(adbPath, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], { encoding: 'utf8' });
    if (result.status === 0) {
      console.log(`[expo-start] ADB reverse enabled for ${serial} on port ${port}.`);
      reversed = true;
    } else {
      const message = (result.stderr || result.stdout || '').trim();
      console.warn(`[expo-start] ADB reverse failed for ${serial}${message ? `: ${message}` : '.'}`);
    }
  }

  return reversed;
};

const run = async () => {
  const expoArgs = [require.resolve('expo/bin/cli'), 'start'];
  const env = { ...process.env };
  const explicitHostMode = hasFlag('--lan', '--localhost', '--tunnel');
  const selectedPort = hasPortFlag() ? getRequestedPort() : await findFreePort(DEFAULT_PORT);
  const adbPath = findAdb();
  const androidDevices = getConnectedAndroidDevices(adbPath);
  const shouldTryReverse = selectedPort && !hasFlag('--lan', '--tunnel') && androidDevices.length > 0;

  if (!hasFlag('--go', '--dev-client')) {
    expoArgs.push('--go');
  }

  if (!hasFlag('--clear', '-c')) {
    expoArgs.push('--clear');
  }

  if (shouldTryReverse && reversePortForDevices(adbPath, androidDevices, selectedPort)) {
    if (!hasFlag('--localhost')) expoArgs.push('--localhost');
  } else if (!explicitHostMode) {
    expoArgs.push('--lan');
  }

  if (!hasFlag('--localhost', '--tunnel')) {
    const lanAddress = getLanAddress();
    if (lanAddress && !env.REACT_NATIVE_PACKAGER_HOSTNAME) {
      env.REACT_NATIVE_PACKAGER_HOSTNAME = lanAddress;
      console.log(`[expo-start] LAN host set to ${lanAddress}.`);
    }
  }

  if (!hasPortFlag()) {
    expoArgs.push('--port', String(selectedPort));
    console.log(`[expo-start] Using port ${selectedPort}.`);
  }

  expoArgs.push(...userArgs);

  const child = spawn(process.execPath, expoArgs, {
    cwd: process.cwd(),
    env: {
      ...env,
      EXPO_NO_DOTENV: env.EXPO_NO_DOTENV || '0',
    },
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
};

run().catch((error) => {
  console.error(`[expo-start] ${error.message}`);
  process.exit(1);
});
