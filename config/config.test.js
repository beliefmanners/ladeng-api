'use strict';

module.exports = appInfo => {
  const config = {};
  config.env = '测试环境';
  config.appInfo = appInfo;
  return config;
};
