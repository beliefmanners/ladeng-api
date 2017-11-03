'use strict';
const APPCONFIG = require('../.webhookconfig.json');

module.exports = appInfo => {
  const config = {};
  config.appInfo = appInfo;
  config.APPCONFIG = APPCONFIG;
  return config;
};
