'use strict';
const shell = require('shelljs');
const SimmpleGit = require('simple-git');
const path = require('path');
const node_ssh = require('node-ssh');

module.exports = app => {
    class ServiceService extends app.Service {
        constructor(props) {
            super(props);
            this.tableWebhookName = 'TW_webhook';
            this.tableWebhookServiceDeployName = 'TW_webhook_service_deploy';
            this.tableServiceName = 'TW_service';
        }
        /*
        * 添加或者更新服务 初始化项目的部署状态
        * */
        * initWebhookServiceDeploy(serviceId) {
            let serviceDeployArr = yield this.knex(this.tableWebhookServiceDeployName).select('*').where({
                serviceId
            });
            let webhookArr = yield this.knex(this.tableWebhookName).select(['id','projectId','userId']);
            if (serviceDeployArr.length) {
                yield this.knex(this.tableWebhookServiceDeployName).update({
                    updateTime: new Date(),
                    deployStatus: 0,
                    deployStatusText: '尚未部署',
                    deployLogId: 0
                }).where({
                    serviceId
                })
            } else {
                let insertArr = [];
                webhookArr.map((val) => {
                    insertArr.push({
                        webhookId: val.id,
                        projectId: val.projectId,
                        deployStatus: 0,
                        deployStatusText: '尚未部署',
                        deployLogId:0,
                        serviceId,
                        userId: val.userId,
                        updateTime: new Date(),
                        createTime: new Date()
                    })
                });
                yield this.knex(this.tableWebhookServiceDeployName).insert(insertArr);
            }
        }
        * initWebhookServiceDeployByWebhook({webhookId}) {
            let serviceDeployArr = yield this.knex(this.tableWebhookServiceDeployName).select('*').where({webhookId});
            let webhookArr = yield this.knex(this.tableWebhookName).select(['id','projectId','userId']).where({
                id:webhookId
            });
            let webhookProject = webhookArr[0] || {};
            let serviceArr = yield this.knex(this.tableServiceName).select(['id']);
            if (serviceDeployArr.length) {
                yield this.knex(this.tableWebhookServiceDeployName).update({
                    updateTime: new Date(),
                    deployStatus: 0,
                    deployStatusText: '尚未部署',
                    deployLogId:0
                }).where({
                    webhookId
                })
            } else {
                let insertArr = [];
                serviceArr.map((val) => {
                    insertArr.push({
                        webhookId,
                        projectId: webhookProject['projectId'],
                        deployStatus: 0,
                        deployStatusText: '尚未部署',
                        deployLogId:0,
                        serviceId: val.id,
                        userId: webhookProject['userId'],
                        updateTime: new Date(),
                        createTime: new Date()
                    })
                });
                yield this.knex(this.tableWebhookServiceDeployName).insert(insertArr);
            }
        }
    }
    return ServiceService;
};
