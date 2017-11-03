'use strict';

module.exports = app => {
    /*
    *  @router { post } 入库webhook 项目信息
    * */
    app.post('/', app.controller.webhook.webhook.saveInfo);
    /*
    *  @router { GET } 获取webhook列表
    *  @query userId
    * */
    app.get('/api/webhook/findAll', app.controller.webhook.webhook.findAll);
    /*
    * @router { POST } 部署项目
    * @Header
    * @Params  { token }      用户token
    * @Body
    * @Params { webhookId }  webhook项目id
    * @Params { serviceId }
    * */
    app.post('/api/webhook/deploy', app.controller.webhook.webhook.deploy);
    /*
    * 应用配置
    * */
    app.post('/api/webhook/config', app.controller.webhook.webhook.AppConfig);
    app.get('/api/webhook/configById', app.controller.webhook.webhook.FindConfigById);
    /*
    * 获取所有配置完成的应用
    * */
    app.get('/api/webhook/findConfigAll', app.controller.webhook.webhook.webhookConfigFindAll);
    /*
    * @router { GET } 部署项目的日志
    * */
    app.get('/api/webhook/log/findAll', app.controller.webhook.webhook.logFindAll);
    /*
    * @router
    * 搜索日志
    * */
    app.get('/api/webhook/log/search', app.controller.webhook.webhook.logSearch);
    /*
    * 获取项目备份的 tags
    * */
    app.get('/api/webhook/back/getBranch', app.controller.webhook.back.getBranch);
    /*
    * 项目回滚
    * */
    app.post('/api/webhook/back/rollBackProject', app.controller.webhook.back.rollBackProject)
};

