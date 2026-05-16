const { app, BrowserWindow, shell, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Keep a global reference so the window isn't garbage-collected
let mainWindow = null;

const isDev = !app.isPackaged;

// Register srf protocol as secure and privileged before app is ready
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'srf',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            bypassCSP: true,
            corsEnabled: true,
            allowServiceWorkers: true
        }
    }
]);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: 'Sri Ram Fashions',
        icon: isDev 
            ? path.join(__dirname, '..', 'src', 'assets', 'logo.jpg') 
            : path.join(__dirname, '..', 'dist', 'logo.jpg'),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false, // Help with loading local assets
            allowRunningInsecureContent: true
        },
        show: false, // show after ready-to-show for a cleaner launch
    });

    // Graceful show
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Open external links in the default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        // Use custom secure scheme for production SPA bundle
        mainWindow.loadURL('srf://app/index.html');
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Handler for srf custom protocol
app.whenReady().then(() => {
    protocol.handle('srf', (request) => {
        const urlObj = new URL(request.url);
        let relativePath = decodeURIComponent(urlObj.pathname);
        if (relativePath.startsWith('/')) {
            relativePath = relativePath.slice(1);
        }

        let absolutePath = path.join(__dirname, '..', 'dist', relativePath);

        // If file doesn't exist or is directory, serve index.html (SPA routing support)
        if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
            absolutePath = path.join(__dirname, '..', 'dist', 'index.html');
        }

        return net.fetch(url.pathToFileURL(absolutePath).toString());
    });

    createWindow();
});

// macOS: re-create window when dock icon is clicked and no windows are open
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
