'use strict';

module.exports = app => {
    class ServiceController extends app.Controller {
        constructor(props) {
            super(props);
            this.tableServiceName = 'TW_service';
            this.serviceField = [ 'id', 'ip', 'name', 'account', 'pkey', 'sshKey', 'port', 'serviceTag','saveProjectPath', 'serviceTagText', 'serviceTag', 'updateTime', 'remark', 'status' ];
            this.service_tag_text = [{
                value:'3Dtest',
                text:'3段测试服务器'
            },{
                value:'5Dtest',
                text:'5段测试服务器'
            },{
                value:'8Dtest',
                text:'8段测试服务器'
            },{
                value:'other',
                text:'其他'
            },{
                value:'official',
                text:'正式服务器'
            }];
            this.findTagText = (tag) =>{
                let arr = this.service_tag_text;
                for (let i = 0; i< arr.length; i++) {
                    if(arr[i].value === tag) {
                        return arr[i].text;
                    }
                }
                return '其他'
            };
        }
        * findAll() {
            const { service } = this;
            let result = yield service.common.common.baseSelect(this.tableServiceName, this.serviceField,{status:1});
            if (result.status)
                this.success(result.data);
            else
                this.error(result.msg);
        }
        * findById(ctx) {
            const { id } = ctx.query;
            if (!id) {
                this.error('参数有误');
                return;
            }
            const { service } = this;
            let result = yield service.common.common.baseSelect(this.tableServiceName, this.serviceField, {id});
            if (result.status)
                this.success(result.data);
            else
                this.error(result.msg);
        }
        * configService(ctx) {
            let {account, name, port = 80, sshKey, ip, pkey, id, status = 1, remark='', serviceTag = 'test',saveProjectPath} = ctx.request.body;
            if (!account || !name || !sshKey || !ip || !pkey || !saveProjectPath) {
                this.error('参数有误');
                return;
            }
            status = this.parseStatus(status);

            const { service } = this;
            if(!status && id) {
                yield service.common.common.update(this.tableServiceName, {status: 0}, {id});
                this.success();
                return;
            }
            // 检查服务器是否有效
            let LoginService = service.common.basedeploy.loginService({ip,sshKey,account});
            let LoginRseult = yield LoginService.then((res) => {
                return res;
            }).catch((err) => {
                return err;
            });
            if (!LoginRseult.status) {
                this.error(LoginRseult.error);
                return;
            }

            let field = {
                account,
                name,
                port,
                sshKey,
                pkey,
                status,
                ip,
                remark,
                serviceTag,
                saveProjectPath,
                serviceTagText: this.findTagText(serviceTag) || '其他'
            };
            let serviceId = id;
            if (id) {
                field.updateTime = new Date();
                let serviceDeployField = {
                    deployLogId: 0,
                    deployStatus: 0,
                    deployStatusText:'尚未部署',
                    updateTime: new Date()
                };
                let result = yield service.common.common.update(this.tableServiceName, field, {id});
                /*
                *  初始化 该服务器相关应用配置
                * */
                yield service.common.common.update(this.tableWebhookServiceDeployName,serviceDeployField ,{serviceId});
                if (result)
                    this.success();
                else
                    this.error();
            } else {
                field.createTime = new Date();
                field.updateTime = new Date();
                serviceId = yield service.common.common.add(this.tableServiceName, field);
                if (serviceId)
                    this.success();
                else
                    this.error();
            }
            // findTagText = null;
            //yield service.service.service.initWebhookServiceDeploy(serviceId);
        }
    }
    return ServiceController;
};
