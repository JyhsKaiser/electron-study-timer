const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Función para cambiar entre modo ventana y modo widget
    setWidgetMode: (isWidget) => ipcRenderer.send('toggle-widget-mode', isWidget)
});