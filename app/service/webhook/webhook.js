'use strict';

module.exports = app => {
    class WebhookService extends app.Service {
        constructor(props) {
            super(props);
            this.tableWebhookName = 'TW_webhook';
            this.tableWebhookDeployLogName = 'TW_webhook_deploy_log';
            this.tableWebhookConfigName = 'TW_webhook_config';
            this.tableServiceName = 'TW_service';
            this.tableWebhookServiceDeployName = 'TW_webhook_service_deploy';
            this.webhookServiceDeployField = ['deployStatus','isSuccess', 'deployStatusText','gitTags', 'deployLogId', 'updateTime'];
            this.serviceField = [ 'id', 'ip', 'name', 'account', 'pkey', 'sshKey', 'port' ,'serviceTag', 'serviceTagText', 'serviceTag', 'saveProjectPath','updateTime', 'remark', 'status' ];
            this.webhookConfigField = ['id','webhookId','serviceIds','saveProjectPath','updateTime','createTime'];
            this.webhookField = ['id','projectId','projectName','webUrl','description','sshUrl','gitTags','updateTime'];
            this.webhookDeployLogField = ['projectName','sshUrl','serviceAccount','deployStatusText','deployStatus','webUrl','sshUrl','serviceIp','gitTags','successFile','failFile','gitBackSshUrl','error','createdTime','remark'];
        }
        * isHaveProject(id) {
            let result = yield this.knex(this.tableWebhookName).select('*').where({
                projectId: id
            });
            return {
                status: Boolean(result.length),
                data: result[0]
            };
        }
        * update(where,field) {
            yield this.knex(this.tableWebhookName).update(field).where(where);
        }
        * add(field) {
            let result = yield this.knex(this.tableWebhookName).insert(field);
            return result[0];
        }
        * findWebhookConfig(userId) {
            let result = yield this.knex(this.tableWebhookConfigName).select(this.webhookConfigField).where('userIds', 'like', `%${userId}%`);
            let outPut = [];
            for (let i = 0; i< result.length; i++) {
                let val = result[i];
                let { saveProjectPath, updateTime } = val;
                let webhook = yield this.knex(this.tableWebhookName).select(this.webhookField).where({
                    id: val.webhookId
                });
                let serviceIds = val.serviceIds;
                let serviceArr = [];
                if(serviceIds) {
                    serviceArr = yield this.knex(this.tableServiceName).select(this.serviceField).where({status: 1}).whereIn('id', serviceIds.split(','));
                    for (let n = 0;n < serviceArr.length; n ++) {
                        let deployResult = yield this.knex(this.tableWebhookServiceDeployName).select(this.webhookServiceDeployField).where({
                            webhookId:val.webhookId,
                            serviceId: serviceArr[n].id
                        });
                        if(deployResult[0] && deployResult[0].deployLogId && deployResult[0].deployStatus){
                            let deployLog = yield this.knex(this.tableWebhookDeployLogName).select(this.webhookDeployLogField).where({
                                id: deployResult[0].deployLogId
                            });
                            serviceArr[n].deployLog = deployLog[0];
                        }
                        serviceArr[n] = Object.assign({}, serviceArr[n], deployResult[0] || {});
                    }

                }
                if(webhook.length) {
                    outPut.push(Object.assign({}, webhook[0], {saveProjectPath, updateTime},{serviceArr}))
                }
            }
            if(outPut.length){
                return {
                    status: true,
                    data: outPut
                }
            } else {
                return {
                    status: false,
                    msg:'没有查询到相关数据'
                }
            }
        }
        * findWebhhookById(webhookId) {
            let result = yield this.knex(this.tableWebhookConfigName).select(this.webhookConfigField).where({webhookId});
            if(result.length)
                return {
                    status: true,
                    data: result[0]
                };
            else
                return{
                    status: false,
                    msg:'没有查询到相关数据'
                }
        }
    }
    return WebhookService;
};
