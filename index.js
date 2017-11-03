const app = require('egg');
app.startCluster({
  baseDir: __dirname,
  workers: process.env.WORKERS,
  port: 8001
});
