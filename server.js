/* 气象观测台 App 本地服务器（零依赖，纯 node）
   用法：node server.js   或双击 start.bat
   PWA 安装要求 http(s)，file:// 无法注册 Service Worker。 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8090);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer(function (req, res) {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  /* 桌面仪表版的手机访问入口：/desktop.html → 上级目录 weather.html */
  let file;
  if (p === '/desktop.html' || p === '/desktop') {
    file = path.join(ROOT, '..', 'weather.html');
  } else {
    const safe = path.normalize(p).replace(/^(\.\.[\/\\])+/, '');
    file = path.join(ROOT, safe);
    if (file.indexOf(ROOT) !== 0) { res.writeHead(403); res.end('403'); return; }
  }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 Not Found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});
server.on('error', function (e) {
  if (e && e.code === 'EADDRINUSE') {
    console.log('端口 ' + PORT + ' 已被占用：气象观测台服务器可能已在运行，本实例退出。');
    setTimeout(function () { process.exit(0); }, 2000);
  } else {
    console.error(e);
    process.exit(1);
  }
});
server.listen(PORT, '0.0.0.0', function () {
  console.log('');
  console.log('  气象观测台 App 服务器已启动');
  console.log('  ----------------------------------------');
  console.log('  本机访问:  http://localhost:' + PORT);
  const ifs = os.networkInterfaces();
  Object.keys(ifs).forEach(function (k) {
    (ifs[k] || []).forEach(function (a) {
      if (a.family === 'IPv4' && !a.internal) {
        console.log('  手机访问:  http://' + a.address + ':' + PORT + '   (' + k + ')');
      }
    });
  });
  console.log('  ----------------------------------------');
  console.log('  手机与电脑连同一 Wi-Fi，用手机浏览器打开上面"手机访问"地址，');
  console.log('  再选"添加到主屏幕 / 安装应用"，即装成全屏 App（离线可看上次天气）。');
  console.log('  按 Ctrl+C 停止服务器。');
  console.log('');
});
