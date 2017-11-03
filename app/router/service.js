'use strict';

module.exports = app => {
    /**
     * @api { POST } /api/service/list 服务器列表
     * @apiVersion 1.0.0
     * @apiParam {number} page 分页码 >= 1
     * @apiParam {number} pageSize 分页大小
     * @apiSampleRequest /api/service/list
     * */
    app.get('/api/service/findAll', app.controller.service.service.findAll);
    /**
     * @api { POST } /api/service/list 服务器列表
     * @apiVersion 1.0.0
     * @apiParam {number} page 分页码 >= 1
     * @apiParam {number} pageSize 分页大小
     * @apiSampleRequest /api/service/list
     * */
    app.get('/api/service/findById', app.controller.service.service.findById);
    /**
     * @api { POST } /api/service/operate 服务列表操作
     * @apiVersion 1.0.0
     * @apiParam {String} id 服务唯一标识 非必填
     * @apiParam {String} name 名称
     * @apiParam {String}  port 端口号
     * @apiParam {String}  account Account账号
     * @apiParam {String}  pkey pkey密码
     * @apiParam {String}  sshkey SSHKey
     * @apiParam {String}  status 状态默认是1
     * @apiParam {String}  remark 备注
     * @apiSampleRequest /api/service/operate
     * */
    app.post('/api/service/configService', app.controller.service.service.configService);
};
