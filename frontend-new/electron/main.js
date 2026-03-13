const { app, BrowserWindow, Menu, Tray, shell, dialog, session } = require('electron');
const path = require('path');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}

let mainWindow = null;
let tray = null;

// Window state defaults
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 850;
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 700;

function getIconPath() {
    // Use logo.jpg from assets or fallback to default Electron icon
    const devIcon = path.join(__dirname, '..', 'src', 'assets', 'logo.jpg');
    const prodIcon = path.join(__dirname, '..', 'dist', 'logo.ico');
    return app.isPackaged ? prodIcon : devIcon;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        title: 'Sri Ram Fashions',
        icon: getIconPath(),
        backgroundColor: '#f8fafc',
        show: false, // Show when ready to prevent flash
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: !app.isPackaged,
        },
    });

    // Show window when content is ready (prevents white flash)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Set Content Security Policy to fix Electron security warning
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' http://localhost:* https://*.mongodb.net; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; " +
                    "font-src 'self' https://fonts.gstatic.com data:; " +
                    "img-src 'self' data: blob: https:; " +
                    "frame-src 'self' https://accounts.google.com; " +
                    "connect-src 'self' http://localhost:* https://*.mongodb.net https://*.googleapis.com https://accounts.google.com ws://localhost:*;"
                ]
            }
        });
    });

    // Load app
    const isDev = !app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    // Handle external links — open in system browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Handle window close — minimize to tray instead
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTray() {
    try {
        tray = new Tray(getIconPath());
    } catch {
        // If icon fails, skip tray
        return;
    }

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Sri Ram Fashions',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip('Sri Ram Fashions');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function createAppMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Bill',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.executeJavaScript(
                                "window.location.hash = '/dashboard/billing'"
                            );
                        }
                    },
                },
                { type: 'separator' },
                {
                    label: 'Print',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.print();
                        }
                    },
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.isQuitting = true;
                        app.quit();
                    },
                },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Navigate',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = '/dashboard'"),
                },
                {
                    label: 'Billing',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = '/dashboard/billing'"),
                },
                {
                    label: 'Inventory',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = '/dashboard/inventory'"),
                },
                {
                    label: 'Purchase Entry',
                    accelerator: 'CmdOrCtrl+4',
                    click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = '/dashboard/purchase/entry'"),
                },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Sri Ram Fashions',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About',
                            message: 'Sri Ram Fashions',
                            detail: 'Business Management Desktop Application\nVersion 1.0.0\n\n© 2026 Sri Ram Fashions, Tirupur',
                        });
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App lifecycle
app.whenReady().then(() => {
    createAppMenu();
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow) {
            mainWindow.show();
        }
    });
});

// Focus existing window when second instance is launched
app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
