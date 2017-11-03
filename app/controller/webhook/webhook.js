'use strict';
const _ = require('underscore');
const webhookConfig = require('../../../.webhookconfig.json');
const EGG_SERVER_ENV = process.env.EGG_SERVER_ENV ? process.env.EGG_SERVER_ENV : 'local';
const { parsePath } = require('../../until/index');
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
    class WebhookController extends app.Controller {
        constructor(props) {
            super(props);
            this.tableWebhookName = 'TW_webhook';
            this.tableServiceName = 'TW_service';
            this.tableWebhookDeployLogName = 'TW_webhook_deploy_log';
            this.tableUserName = 'TW_user';
            this.tableWebhookConfigName = 'TW_webhook_config';
            this.tableWebhookBackName = 'TW_webhook_back';
            this.tableWebhookServiceDeployName = 'TW_webhook_service_deploy';
            this.webhookConfigField = ['id','webhookId','serviceIds','saveProjectPath','updateTime','createTime'];
            this.webhookField = ['id','projectId','projectName','webUrl','description','sshUrl','gitTags','updateTime'];
            this.webhookLogField = ['projectName','sshUrl','serviceAccount','deployStatusText','deployStatus','webUrl','sshUrl','serviceIp','gitTags','successFile','failFile','gitBackSshUrl','error','createdTime','remark'];
        }
        * saveInfo(ctx) {
            const repo = ctx.request.body;
            const { event_name, ref, project_id,project } = repo;
            if(event_name === 'push') {
                this.success('ok');
                return;
            }
            if (event_name !== 'tag_push') {
                this.error('只能添加 tag_push hook事件', 401);
                return;
            }
            if (ref.indexOf('publish#') === -1) {
                this.error('tag_push 标签不对；应该是 publish#v1.X.X', 401);
                return;
            }
            const { service } = this;
            let tag = _.last(repo.ref.split('/')).split('#')[1] || 'v1.0.0';
            let userInfo = yield service.common.common.baseSelect(this.tableUserName, ['token'], {id:repo.user_id});//this.knex(this.tableUserName).select(['token']).where({id:repo.user_id});
            if(!userInfo.status){
                return;
            }
            let token = userInfo.data?userInfo.data[0].token:'';
            let userIdsResult = yield this.app.curl(`${this.baseUrl}/projects/${repo.project_id}/members?private_token=${token}`,{
                dataType:'json',
                timeout: 500000,
                method: 'GET'
            });
            let userIds = [];
            if(userIdsResult.status < 300){
                let arr = userIdsResult.data;
                arr.map((obj) => {
                    userIds.push(obj.id)
                });
            };
            let isHaveUserId = userIds.some(function(user_id){
                return user_id === repo.user_id;
            });
            if(!isHaveUserId) {
                userIds.push(repo.user_id);
            }
            // 检查数据库中是否存在 该项目
            let isHaveProject = yield service.webhook.webhook.isHaveProject(project_id);
            let  webhookId, baseField = {
                userIds: userIds.join(','),
                userId:repo.user_id,
                userName: repo.user_email.split('@')[0],
                userEmail: repo.user_email,
                projectId: repo.project_id,
                projectName: project.name,
                sshUrl: project.ssh_url,
                webUrl: project.web_url,
                description: project.description,
                gitTags: tag,
                status: 1,
                updateTime: new Date()
            };
            if (isHaveProject.status) { // 更新
                webhookId = isHaveProject.data.id;
                yield service.webhook.webhook.update({
                    projectId: repo.project_id,
                    userId: repo.user_id
                }, baseField);
            } else { // 增加
                baseField.createTime = new Date();
                webhookId = yield service.webhook.webhook.add(baseField);
            }
            if(webhookId) {
                yield service.common.webhookServiceDeploy.init({webhookId});
            }
            this.success();
        }
        * findAll (ctx) {
            let {token} = ctx.request.headers;
            if(!token) {
                this.error('授权失败');
                return;
            }
            const { service } = this;
            let userInfo = yield service.common.common.baseSelect(this.tableUserName, '*', {token});
            if (!userInfo.status) {
                this.error('授权失败');
                return;
            }
            let userId  = userInfo.data[0].id;
            if (!userId) {
                this.error('参数有误');
                return;
            }

            let result = yield service.common.common.like(this.tableWebhookName, this.webhookField, {key: 'userIds',value:userId},{status:1});
            if (result.status)
                this.success(result.data);
            else
                this.error(result.msg);
        }
        * deploy(ctx) {
            const { token } = ctx.request.header;
            if (!token) {
                this.error('没有传token值');
                return;
            }
            const { webhookId,serviceId } = ctx.request.body;
            if (!webhookId || !serviceId) {
                this.error('参数有误');
                return;
            }
            const { service } = this;
            /*
            *  webhook 应用查询
            * */
            let webhookResult = yield service.common.common.baseSelect(this.tableWebhookName,'*',{id:webhookId});
            /*
            *  服务器配置结果查询
            * */
            let serviceResult = yield service.common.common.baseSelect(this.tableServiceName,'*',{id:serviceId});
            let webhookConfigResult = yield service.common.common.baseSelect(this.tableWebhookConfigName, ['saveProjectPath'], {webhookId});
            if (!webhookResult.status || !serviceResult.status) {
                this.error('请检查应用部署服务器文件路径是否配置完成');
                return;
            };
            webhookResult = webhookResult.data[0]; serviceResult = serviceResult.data[0];
            // 添加 webhook 配置项 serviceId ip
            webhookResult.serviceId = serviceResult.id;
            webhookResult.ip        = serviceResult.ip;
            // console.log(projectInfo);
            let projectInfo= webhookResult;
            let deployInfo = {
                serviceAccount: serviceResult['account'],
                serviceIp: serviceResult['ip']
            };
            /*
            * 声明 必要的参数变量
            * */
            // webhook 服务器本地存储项目地址
            let webhookLocalPath = webhookConfig.projectDeploy[`gitCloneLocalPath_${EGG_SERVER_ENV?EGG_SERVER_ENV:'prod'}`];
            let serviceProjectPath = serviceResult.saveProjectPath;// 服务器配置的 应用 存储地址
            let projectPath = webhookConfigResult.data[0]?webhookConfigResult.data[0].saveProjectPath: ''; // 应用配置的 部署项目地址
            let projectName = projectInfo.projectName; //项目名称
            /*
            *  环节一 查询 package.json 配置项 是否完整
            * */
            const packageResult = yield service.common.basedeploy.checkPackageJSON(webhookResult.webUrl, token);
            let buildPath = packageResult.data?packageResult.data.buildPath:'';
            if (!packageResult.status || !packageResult.data || !buildPath) {
                 deployInfo.deployStatus= -1;
                 deployInfo.error = `请检查${projectInfo.name}项目package.json 中 webhook 是否配置完整`;
                 deployInfo.msg = `请检查${projectInfo.name}项目package.json 中 webhook 是否配置完整`;
                 yield service.common.basedeploy.saveDelpoyLog(projectInfo,deployInfo);
                 this.error(deployInfo.error);
                 return;
            }

            /*
            * 环节二 克隆代码到本地
            * */
            const gitProjectPromise = service.common.basedeploy.gitConleToLocal(projectInfo);
            const gitProjectResult = yield gitProjectPromise.then((res) => {
                return res;
            }).catch((res) => {
                if (res && res.status !== undefined){
                    return res;
                }
                return {
                    status: false,
                    error: String(res),
                    deployStatus: 203,
                    msg: `${projectInfo.name} 项目代码克隆至 webhook 服务器出错：${String(res)}`
                }
            });
            if (!gitProjectResult.status) {
                deployInfo = Object.assign({}, deployInfo, gitProjectResult);
                yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                this.error(deployInfo.error || deployInfo.msg);
                return;
            }
            let Git = gitProjectResult.Git;
            /*
            * 环节三 写入文件 版本
            * */
            let pushBuildPath = '/'+parsePath(webhookLocalPath,projectName, buildPath);
            const writeFilePromise = service.common.basedeploy.addTagAndDate(pushBuildPath,projectInfo.gitTags);
            const writeFileResult = yield writeFilePromise.then((res) => {
                return res;
            }).catch((res) => {
                if(res && res.status === undefined) {
                    return {
                        status: false,
                        msg: `文件写入版本${projectInfo.gitTags} 失败`
                    }
                }
                return res;
            });
            console.log(webhookLocalPath);
            console.log(`============>${writeFileResult.msg}`);

            /*
            * 环节四 登录远程服务器
            * */
            const loginService = service.common.basedeploy.loginService(serviceResult);
            const loginServiceResult = yield loginService.then((res) => {
                return res;
            }).catch((res) => {
                if (res && res.status !== undefined) {
                    return res;
                }
                return {
                    status: false,
                    deployStatus: 300,
                    error: String(res),
                    msg: `${projectInfo.name} 登录远程服务器出错：${String(res)}`
                }
            });
            if(!loginServiceResult.status) {
                deployInfo = Object.assign({}, deployInfo, loginServiceResult);
                yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                this.error(deployInfo.error || deployInfo.msg);
                return;
            }
            /*
            * 环节五 部署代码到远程服务器
            * */
            let SSH = loginServiceResult.SSH;
            const deployProjectToRomtePromise = service.common.basedeploy.deployProjectToRomte(SSH,{projectName,webhookLocalPath,serviceProjectPath,projectPath,buildPath});
            const deployProjectToRomteResult = yield deployProjectToRomtePromise.then((res) => {
                return res;
            }).catch((res) => {
                if (res && res.status !== undefined)
                    return res;
                else
                    return {
                        deployStatus: -2,
                        msg: `${projectInfo.name} 代码部署远程服务器出错：${String(res)}`,
                        status: false,
                        error: res.toString()
                    }
            });
            if (!deployProjectToRomteResult.status) {
                deployInfo = Object.assign({}, deployInfo, deployProjectToRomteResult);
                yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                this.error(deployInfo.error || deployInfo.msg);
                return;
            } else {
                let updateField = {
                    isSuccess: 1,
                    updateTime: new Date(),
                    gitTags:projectInfo.gitTags
                };
                yield service.common.common.update(this.tableWebhookServiceDeployName, updateField,{
                    webhookId:webhookId,
                    serviceId: serviceId
                });
                // 还原本地 git checkout .
                Git.checkout('.');
            }
            /*
            * 环节六 部署项目代码 备份 并检测是否备份过该分支
            * */
            // 检查 该项目是否备份过
            let checkProjectIsBack = yield service.common.basedeploy.checkProjectIsBackGitlab(projectInfo, token);
            let projectBack = null, isBackBranch;
            if(checkProjectIsBack.status){
                projectBack = checkProjectIsBack.data;
            };
            /*
            *  如果该项目已经在FE_BFK 上创建了；检查是否 备份该版本
            * */
            if(projectBack){
               isBackBranch = yield service.common.basedeploy.checkProjectIsBackBranch(projectBack.id, projectInfo.gitTags, token);
               if(isBackBranch.status) { // 已经备份过该版本
                   deployInfo = Object.assign({}, deployInfo, deployProjectToRomteResult,{deployStatus: 500});
                   yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                   this.success(deployInfo, '部署完成；备份完成');
                   return;
               }
            }
            const backProjectToGitlab= service.common.basedeploy.backProjectToGitlab(projectInfo, projectBack, {token,buildPath:packageResult.data.buildPath});
            const backProjectToGitlabResult = yield backProjectToGitlab.then((res) => {
                return res;
            }).catch((res) => {
                if(res.status !== undefined)
                    return res;
                else
                    return {
                        deployStatus: -2,
                        msg: `${projectInfo.name} 部署文件备份出错：${String(res)}`,
                        status: false,
                        error: res.toString()
                    }
            });
            deployInfo = Object.assign({}, deployInfo, backProjectToGitlabResult);
            yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
            if(backProjectToGitlabResult.data){
                let projectBackInfo = backProjectToGitlabResult.data;
                let projectId = projectBackInfo.projectId;
                let backResult = yield service.common.common.baseSelect(this.tableWebhookBackName, ['backId'],{projectId});
                if(backResult.status){
                    projectBackInfo['backId'] = backResult.data[0]['backId'];
                };
                yield service.common.basedeploy.saveProjectBackLog(projectBackInfo);
            }
            if(backProjectToGitlabResult.status){
                this.success({successFile: deployProjectToRomteResult.successFile, failFile: deployProjectToRomteResult.failFile},backProjectToGitlabResult.msg);
            } else {
                this.error(deployInfo.error || deployInfo.msg);
            }
            
        }
        * logFindAll(ctx) {
            const { token } = ctx.request.headers;
            if (!token) {
                this.error('授权失败', 401);
                return;
            }
            const { service } = this;
            const userInfo = yield service.common.common.baseSelect(this.tableUserName, ['id'],{token});
            if(!userInfo.status) {
                this.error('授权失败', 401);
                return;
            }
            let userId = userInfo.data[0].id;
            let result = yield service.common.common.baseSelect(this.tableWebhookDeployLogName, this.webhookLogField, {userId});
            if (result.status)
                this.success(result.data);
            else
                this.error(result.msg);
        }
        * logSearch(ctx) {
            const { token } = ctx.request.headers;
            if (!token) {
                this.error('授权失败', 401);
                return;
            }
            const { service } = this;
            const userInfo = yield service.common.common.baseSelect(this.tableUserName, ['id'],{token});
            if(!userInfo.status) {
                this.error('授权失败', 401);
                return;
            }
            const { projectName, gitTags, deployStatus, serviceIp, serviceAccount } = ctx.query;
            const query = ctx.query;
            let userId = userInfo.data[0].id;
            if (!projectName && !gitTags && !deployStatus && !serviceIp && !serviceAccount) {
                this.error('参数有误');
                return;
            }
            let where = {
                userId
            };
            let searchField = ['projectName','gitTags','deployStatus','serviceIp','serviceAccount'];
            searchField.map((key) => {
                if (query[key]) {
                    where[key] = query[key];
                }
            });
            let result = yield service.common.common.baseSelect(this.tableWebhookDeployLogName, this.webhookLogField,where);
            if (result.status)
                this.success(result.data)
            else
                this.error(result.msg);
        }
        * AppConfig(ctx) {
            let { token } = ctx.request.headers;
            if (!token){
                this.error('授权失败', 200);
                return;
            }
            const { service } = this;
            let userInfoResult = yield service.common.common.baseSelect(this.tableUserName,'*',{token});
            if(!userInfoResult.status){
                this.error('授权失败', 200);
                return;
            }
            let userInfo = userInfoResult.data[0];

            let {id , status=1, serviceIds, webhookId, saveProjectPath, projectId} = ctx.request.body;
            if(!serviceIds || !webhookId || !saveProjectPath || !projectId ) {
                this.error('参数有误');
                return
            }
            let webhookResult = yield service.common.common.baseSelect(this.tableWebhookName, ['userIds'], {id: webhookId});
            let userIds = [];
            if(webhookResult.status){
                let userIdsStr = webhookResult.data ? webhookResult.data[0].userIds: '';
                userIds = userIdsStr?userIdsStr.split(','): [];
            }
            let field = {
                updateTime:new Date(),
                status,
                userId:userInfo.id,
                userIds:userIds.join(','),
                saveProjectPath,
                webhookId,
                serviceIds
            };

            let result, serviceArr = serviceIds.split(',');

            if (id) {
                // 更新配置
                let oldService = yield service.common.common.baseSelect(this.tableWebhookConfigName,'*',{id});
                if(oldService.status){
                    let serviceOldArr = oldService.data[0].serviceIds.split(',');
                    let delServiceArr = serviceOldArr.minus(serviceArr);
                    let insertServiceArr = serviceArr.minus(serviceOldArr);
                    if(delServiceArr.length)
                        yield service.common.webhookServiceDeploy.del(webhookId,delServiceArr);
                    if(insertServiceArr.length){
                        let addField = [];
                        let arr = insertServiceArr.map((val) => {
                            return {
                                serviceId: val,
                                webhookId: webhookId,
                                deployStatus:0,
                                deployStatusText:'尚未部署',
                                updateTime: new Date(),
                                createTime: new Date(),
                                deployLogId:0,
                                projectId,
                                isSuccess:0
                            }
                        });
                        if(userIds.length){
                            for (let i = 0;i< userIds.length; i++) {
                                for(let a = 0; a < arr.length; a ++) {
                                    let obj = arr[a];
                                    obj.userId = userIds[i];
                                    addField.push(Object.assign({}, obj));
                                }
                            }
                        } else {
                            addField = arr.map((val) => {
                                val.userId = userInfo.id
                            });
                        }
                        yield service.common.webhookServiceDeploy.add(addField)
                    }
                }
                result = yield service.common.common.update(this.tableWebhookConfigName,field, {id});
            } else {
                field.createTime = new Date();
                result = yield service.common.common.add(this.tableWebhookConfigName, field);
                let addField = [];
                let arr = serviceArr.map((val) => {
                    return {
                        serviceId: val,
                        webhookId: webhookId,
                        deployStatus:0,
                        deployStatusText:'尚未部署',
                        updateTime: new Date(),
                        createTime: new Date(),
                        deployLogId:0,
                        projectId,
                        isSuccess:0
                    }
                });
                if(userIds.length){
                    for (let i = 0;i< userIds.length; i++) {
                        for(let a = 0; a < arr.length; a ++) {
                            let obj = arr[a];
                            obj.userId = userIds[i];
                            addField.push(Object.assign({}, obj));
                        }
                    }
                } else {
                    addField = arr.map((val) => {
                        val.userId = userInfo.id
                    });
                }
                // 添加部署管理信息
                yield service.common.webhookServiceDeploy.add(addField);
            }

            // 删除之间部署信息
            // yield service.common.webhookServiceDeploy.del();
            if(result > 0)
                this.success(`${id?'更新成功':'添加成功'}`);
            else
                this.error(`${id?'更新失败':'添加失败'}`)
        }
        * webhookConfigFindAll(ctx) {
            let { token } = ctx.request.headers;
            if(!token) {
                this.error('授权失败');
                return;
            }
            const { service } = this;
            let userResult = yield service.common.common.findUser({token});
            if(!userResult.status){
                this.error(userResult.msg);
                return;
            }
            let {id} = userResult.data;
            let result = yield service.webhook.webhook.findWebhookConfig(id);
            
            if(!result.status) {
                this.error(result.msg);
                return;
            }
            this.success(result.data);
        }
        * FindConfigById(ctx) {
            let { token } = ctx.request.headers;
            if(!token) {
                this.error('授权失败');
                return;
            }
            const { service } = this;
            let { webhookId } = ctx.query;
            if(!webhookId) {
                this.error('参数有误');
                return;
            }
            let result = yield service.webhook.webhook.findWebhhookById(webhookId);
            if(!result.status) {
                this.error(result.msg);
                return;
            }
            this.success(result.data);
        }
    }
    return WebhookController;
};
