'use strict';
module.exports = app => {
    class ServiceController extends app.Controller{
        constructor(props) {
            super(props);
            this.tableWebhookServiceDeployName = 'TW_webhook_service_deploy'
        }
        * init(where){
            let field = {
                updateTime: new Date(),
                deployStatus: 0,
                isSuccess:0,
                deployStatusText: '尚未部署'
            };
            let result = yield this.knex(this.tableWebhookServiceDeployName).update(field).where(where);
            return result;
        }
        * add(field) {
            let result = yield this.knex(this.tableWebhookServiceDeployName).insert(field);
            return result;
        }
        * del(webhookId,delServiceArr) {
            let result = yield this.knex(this.tableWebhookServiceDeployName).where({webhookId}).whereIn('serviceId', delServiceArr).del();
            return result;
        }

    }
    return ServiceController;
};
