const { app, BrowserWindow, WebContentsView, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;
const views = {};
let activeViewKey = null;

const AI_SERVICES = {
  gemini: {
    url: 'https://gemini.google.com/',
    partition: 'persist:gemini',
    allowedDomains: ['google.com', 'gstatic.com']
  },
  chatgpt: {
    url: 'https://chatgpt.com/',
    partition: 'persist:chatgpt',
    allowedDomains: ['chatgpt.com', 'openai.com', 'auth0.com']
  },
  claude: {
    url: 'https://claude.ai/',
    partition: 'persist:claude',
    allowedDomains: ['claude.ai', 'anthropic.com']
  },
  grok: {
    url: 'https://grok.com/',
    partition: 'persist:grok',
    allowedDomains: ['grok.com', 'x.com', 'twitter.com']
  },
  deepseek: {
    url: 'https://chat.deepseek.com/',
    partition: 'persist:deepseek',
    allowedDomains: ['deepseek.com']
  }
};

function isAllowed(url, service) {
  try {
    const targetHostname = new URL(url).hostname;
    return service.allowedDomains.some(domain => targetHostname.endsWith(domain));
  } catch (e) {
    return false;
  }
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  // Handle window resize to update the bounds of the active WebContentsView
  mainWindow.on('resize', () => {
    if (activeViewKey && views[activeViewKey]) {
      updateViewBounds(views[activeViewKey]);
    }
  });
}

function updateViewBounds(view) {
  const [width, height] = mainWindow.getContentSize();
  const sidebarWidth = 60; // Must match styles.css
  view.setBounds({
    x: sidebarWidth,
    y: 0,
    width: width - sidebarWidth,
    height: height
  });
}

function getOrCreateView(key) {
  if (views[key]) return views[key];

  const service = AI_SERVICES[key];
  if (!service) return null;

  const view = new WebContentsView({
    webPreferences: {
      partition: service.partition,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Handle external links (window.open)
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowed(url, service)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Intercept navigation to prevent leaving the service's allowed domains
  view.webContents.on('will-navigate', (event, url) => {
    if (!isAllowed(url, service)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Also handle links that might be clicked within the webview
  view.webContents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame && !isAllowed(event.url, service)) {
      event.preventDefault();
      shell.openExternal(event.url);
    }
  });

  view.webContents.loadURL(service.url);
  views[key] = view;
  return view;
}

ipcMain.on('switch-service', (event, key) => {
  if (activeViewKey === key) return;

  // Hide previous view
  if (activeViewKey && views[activeViewKey]) {
    mainWindow.contentView.removeChildView(views[activeViewKey]);
  }

  const view = getOrCreateView(key);
  if (view) {
    mainWindow.contentView.addChildView(view);
    updateViewBounds(view);
    activeViewKey = key;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
