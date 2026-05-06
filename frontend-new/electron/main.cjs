const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Keep a global reference so the window isn't garbage-collected
let mainWindow = null;

const isDev = !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: 'Sri Ram Fashions',
        icon: path.join(__dirname, '..', 'src', 'assets', 'logo.jpg'),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
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
        // In dev mode, load from Vite dev server
        mainWindow.loadURL('http://localhost:5173');
        // Uncomment to auto-open DevTools:
        // mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built index.html from the dist folder
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

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

app.whenReady().then(createWindow);
