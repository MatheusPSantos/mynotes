const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

process.env.NOTES_DATA_DIR = path.join(app.getPath('userData'), 'data');
const server = require('./server');

if (!app.requestSingleInstanceLock()) app.quit();

let win;
const createWindow = () => {
  win = new BrowserWindow({ width: 900, height: 700, title: 'Notes', autoHideMenuBar: true });
  Menu.setApplicationMenu(null);
  win.loadURL(`http://127.0.0.1:${server.address().port}/`);
};

app.on('second-instance', () => win && (win.isMinimized() && win.restore(), win.focus()));

app.whenReady().then(() => {
  // Port 0 = random free port, bound to loopback only
  server.listen(0, '127.0.0.1', createWindow);
});

app.on('window-all-closed', () => app.quit());
