const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    // Configuramos la ventana principal
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'Gestor de Tiempos',
        webPreferences: {
            // Usamos un preload script por seguridad (buenas prácticas de Electron)
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Cargamos el archivo HTML de la interfaz
    mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

    // Opcional: Abrir las herramientas de desarrollo para depurar
    // mainWindow.webContents.openDevTools();
}

// Cuando Electron esté listo, creamos la ventana
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Cerramos la app cuando todas las ventanas se cierran (excepto en macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Agrega esto al final de tu src/main.js
ipcMain.on('toggle-widget-mode', (event, isWidget) => {
    if (isWidget) {
        // Modo Widget: Pequeño y siempre visible
        mainWindow.setSize(550, 300);
        mainWindow.setAlwaysOnTop(true, 'screen-saver'); // Se asegura de quedar por encima de todo
        Opcional: mainWindow.setOpacity(0.8);
    } else {
        // Modo Configuración: Tamaño normal y comportamiento estándar
        mainWindow.setSize(800, 600);
        mainWindow.setAlwaysOnTop(false);
        Opcional: mainWindow.setOpacity(0.8);
    }

    // Centramos la ventana para que el cambio de tamaño no la deje en una esquina extraña
    mainWindow.center();
});