const config = require('./.webhookconfig.json');
const EGG_SERVER_ENV = process.env.EGG_SERVER_ENV ? process.env.EGG_SERVER_ENV : 'local';
const knex = require('knex')(config.mysql[EGG_SERVER_ENV]);
const bookshelf = require('bookshelf')(knex);
const axios = require('axios');

/**
 *  两个数组之间 求交集
 * */
Array.intersect = function() {
    const result = [];
    const obj = {};
    for (let i = 0; i < arguments.length; i++) {
        for (let j = 0; j < arguments[i].length; j++) {
            const str = arguments[i][j];
            if (!obj[str]) {
                obj[str] = 1;
            } else {
                obj[str]++;
                if (obj[str] === arguments.length) {
                    result.push(str);
                }
            }
        }
    }
    return result;
};
/**
 *  数据之间 求差集
 *
 * */
Array.prototype.minus = function(arr) {
    const result = [];
    const obj = {};
    for (let i = 0; i < arr.length; i++) {
        obj[arr[i]] = 1;
    }
    for (let j = 0; j < this.length; j++) {
        if (!obj[this[j]]) {
            obj[this[j]] = 1;
            result.push(this[j]);
        }
    }
    return result;
};


module.exports = app => {
    class CustomController extends app.Controller {
        constructor(props) {
            super(props);
            this.knex = knex;
            this.bookshelf = bookshelf;
            this.tableWebhookServiceDeployName = 'TW_webhook_service_deploy';
            this.baseUrl = 'http://git.gag.cn/api/v3';
            this.axios = axios;
            this.initTableName();
        }
        error(message = '操作失败', status = 200, data) {
            if (typeof message === 'string') {
            this.ctx.body = {
                    msg: message,
                    status_code: status,
                    data,
                    status: 'F',
                };
            } else {
                this.ctx.body = Object.assign({}, {
                    status_code: status,
                    data,
                    status: 'F',
                }, message);
            }
            this.ctx.status = status;
        }
        success(data,msg='操作成功') {
          if(typeof data === 'string'){
              this.ctx.body = {
                  msg: data,
                  status: 'S',
                  status_code: 200
              }
          } else {
              this.ctx.body = {
                  msg: msg,
                  status: 'S',
                  data,
                  status_code: 200,
              };
          }
          this.ctx.status = 200;
        }
        parseStatus(status) {
            if (typeof status === 'string' && status) {
                try {
                    status = JSON.parse(status)?1 : 0;
                } catch (err){
                    status = 0;
                }
            } else {
                status = status?1:0
            }
            return status;
        }
        initTableName() {
            this.tableWebhookBackName = 'TW_webhook_back';
        }
    }
    app.Controller = CustomController;
    class appService extends app.Service {
        constructor(props) {
            super(props);
            this.knex = knex;
            this.bookshelf = bookshelf;
            this.baseUrl = 'http://git.gag.cn/api/v3';
            this.axios = axios;
            this.initTableName();
        }
        initTableName() {
            this.tableWebhookBackName = 'TW_webhook_back';
        }
    }
    app.Service = appService;
};
