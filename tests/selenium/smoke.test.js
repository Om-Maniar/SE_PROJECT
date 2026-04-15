const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { Builder, Browser, By, until } = require('selenium-webdriver');

const BASE_URL = process.env.SELENIUM_BASE_URL || 'http://127.0.0.1:3000';
const SERVER_START_TIMEOUT_MS = 30000;
const WAIT_TIMEOUT_MS = 15000;

let serverProcess;
let driver;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dismissLoginModalIfVisible() {
  const loginModal = await driver.findElement(By.id('login-modal'));
  const modalClasses = await loginModal.getAttribute('class');
  if (!modalClasses.includes('hidden')) {
    await driver.findElement(By.id('login-skip-link')).click();
    await driver.wait(async () => {
      const classes = await loginModal.getAttribute('class');
      return classes.includes('hidden');
    }, WAIT_TIMEOUT_MS);
  }
}

async function waitForToastsToClear() {
  const toasts = await driver.findElements(By.css('#toast-container .toast'));
  if (toasts.length === 0) {
    return;
  }

  await driver.wait(async () => {
    const activeToasts = await driver.findElements(By.css('#toast-container .toast'));
    return activeToasts.length === 0;
  }, WAIT_TIMEOUT_MS);
}

async function waitForServerReady() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < SERVER_START_TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE_URL}/api/config/status`);
      if (response.ok) {
        return;
      }
    } catch (_) {
      // Server not ready yet.
    }
    await delay(500);
  }
  throw new Error(`Server did not become ready within ${SERVER_START_TIMEOUT_MS}ms at ${BASE_URL}`);
}

before(async () => {
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3000', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', () => {});
  serverProcess.stderr.on('data', () => {});

  await waitForServerReady();

  driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeOptions(
      new (require('selenium-webdriver/chrome').Options)()
        .addArguments('--headless=new', '--disable-gpu', '--window-size=1400,1000')
    )
    .build();
});

after(async () => {
  if (driver) {
    await driver.quit();
  }
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});

test('home page loads and login modal can be dismissed to guest mode', async () => {
  await driver.get(BASE_URL);

  const loginModal = await driver.wait(until.elementLocated(By.id('login-modal')), WAIT_TIMEOUT_MS);
  const modalClasses = await loginModal.getAttribute('class');
  assert.ok(!modalClasses.includes('hidden'), 'Expected login modal to be visible on first load');

  const guestLink = await driver.findElement(By.id('login-skip-link'));
  await guestLink.click();

  await driver.wait(async () => {
    const classes = await loginModal.getAttribute('class');
    return classes.includes('hidden');
  }, WAIT_TIMEOUT_MS, 'Expected login modal to be hidden after continuing as guest');

  const signInButton = await driver.findElement(By.id('btn-show-login'));
  assert.equal(await signInButton.isDisplayed(), true);
});

test('tab navigation switches from Editor to Generator', async () => {
  await driver.get(BASE_URL);

  await dismissLoginModalIfVisible();
  await waitForToastsToClear();

  const generatorTab = await driver.findElement(By.css('.nav-tab[data-tab="generator"]'));
  await generatorTab.click();

  const generatorPanel = await driver.findElement(By.id('panel-generator'));
  await driver.wait(async () => {
    const classes = await generatorPanel.getAttribute('class');
    return classes.includes('active');
  }, WAIT_TIMEOUT_MS, 'Expected Generator panel to become active');

  const input = await driver.findElement(By.id('ai-description-input'));
  assert.equal(await input.isDisplayed(), true);
});

test('settings modal opens and closes from header controls', async () => {
  await driver.get(BASE_URL);

  await dismissLoginModalIfVisible();
  await waitForToastsToClear();

  const settingsButton = await driver.findElement(By.id('btn-settings'));
  await settingsButton.click();

  const settingsModal = await driver.findElement(By.id('settings-modal'));
  await driver.wait(async () => {
    const classes = await settingsModal.getAttribute('class');
    return !classes.includes('hidden');
  }, WAIT_TIMEOUT_MS);

  const closeButton = await driver.findElement(By.id('btn-close-settings'));
  await closeButton.click();

  await driver.wait(async () => {
    const classes = await settingsModal.getAttribute('class');
    return classes.includes('hidden');
  }, WAIT_TIMEOUT_MS);
});
