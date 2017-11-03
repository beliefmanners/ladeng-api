'use strict';

module.exports = appInfo => {
  const config = {};
  config.env = '生产环境';
  config.appInfo = appInfo;
  return config;
};
