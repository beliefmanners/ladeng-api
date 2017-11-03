'use strict';
const _ = require('underscore');
const SimmpleGit = require('simple-git');
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
    class deployProject extends app.Controller {
        constructor(props){
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
        * index() {
            const ctx = this.ctx;
            const Socket = this.ctx.socket;
            const webhookId = ctx.args[0];
            const serviceId = ctx.args[1];
            const token = ctx.args[2];
            const { service } = this;
            if(!token || !webhookId || !serviceId){
                Socket.emit('deployError',{msg:'授权失败'});
                return;
            }
            const link1 = 'link1', link2 = 'link2', link3 = 'link3', link4 = 'link4';
            /*
            *  环节一 查询 package.json、webhook、服务器 配置项 是否完整
            * */
            let link1OutOut = {
                link: 1
            };
            let webhookResult = yield service.common.common.baseSelect(this.tableWebhookName, '*', {id: webhookId});
            let serviceResult = yield service.common.common.baseSelect(this.tableServiceName,'*',{id:serviceId});
            let webhookConfigResult = yield service.common.common.baseSelect(this.tableWebhookConfigName, ['saveProjectPath'], {webhookId});
            if (!webhookResult.status || !serviceResult.status || !webhookConfigResult.status) {
                link1OutOut.msg = '请检查应用服务器部署文件路径是否配置完成';
                link1OutOut.done = true;
                Socket.emit('deployError',link1OutOut);
                return;
            };
            let projectInfo = webhookResult.data[0]; serviceResult = serviceResult.data[0];
            let deployInfo = {
                serviceAccount: serviceResult['account'],
                serviceIp: serviceResult['ip'],
                ip:serviceResult.ip,
                serviceId: serviceId,
                webhookId: webhookId
            };

            /*
            * 声明 必要的参数变量
            * */
            // webhook 服务器本地存储项目地址
            let webhookLocalPath = webhookConfig.projectDeploy[`gitCloneLocalPath_${EGG_SERVER_ENV?EGG_SERVER_ENV:'prod'}`];
            let serviceProjectPath = serviceResult.saveProjectPath;// 服务器配置的 应用 存储地址
            let projectPath = webhookConfigResult.data[0]?webhookConfigResult.data[0].saveProjectPath: ''; // 应用配置的 部署项目地址
            let projectName = projectInfo.projectName; //项目名称
            const packageResult = yield service.common.basedeploy.checkPackageJSON(projectInfo.webUrl, token, link1);
            let buildPath = packageResult.data?packageResult.data.buildPath:'';

            if (!packageResult.status || !packageResult.data || !buildPath) {
                deployInfo.deployStatus= -1;
                deployInfo.error = `请检查${projectName}项目package.json 中 webhook 是否配置完整`;
                deployInfo.msg = `请检查${projectName}项目package.json 中 webhook 是否配置完整`;
                yield service.common.basedeploy.saveDelpoyLog(projectInfo,deployInfo);
                link1OutOut.done = true;
                link1OutOut.msg = deployInfo.msg;

                Socket.emit('deployError', link1OutOut);
                return;
            } else {
                link1OutOut.msg = '配置项查完成，服务器，webhook，package.json配置项完整';
                Socket.emit('deploySuccess',link1OutOut);
            }
            /*
            * 环节二 克隆代码到本地
            * */
            const gitProjectPromise = service.common.basedeploy.gitConleToLocal(projectInfo, link2);
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
                    msg: `${projectName} 项目代码克隆至 webhook 服务器出错：${String(res)}`
                }
            });
            let link2OutOut = {
                link:2,
                msg: gitProjectResult.msg
            };
            if (!gitProjectResult.status) {
                deployInfo = Object.assign({}, deployInfo, gitProjectResult);
                yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                link2OutOut.deno = true;
                Socket.emit('deployError', link2OutOut);
            } else {
                Socket.emit('deploySuccess', link2OutOut)
            }
            let Git = gitProjectResult.Git;
            /*
            * 环节三 写入文件 版本 登录远程服务器 部署代码到远程服务器
            * */
            let pushBuildPath = '/'+parsePath(webhookLocalPath,projectName, buildPath);
            const writeFilePromise = service.common.basedeploy.addTagAndDate(pushBuildPath,projectInfo.gitTags, link3);
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
            let link3OutOut = {
                link: 3
            };
            const loginService = service.common.basedeploy.loginService(serviceResult, link3);
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
                    msg: `${projectName} 登录远程服务器出错：${String(res)}`
                }
            });

            if(!loginServiceResult.status) {
                deployInfo = Object.assign({}, deployInfo, loginServiceResult);
                yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                link3OutOut.msg = loginServiceResult.msg;
                link3OutOut.deno = true;
                Socket.emit('deployError', link3OutOut);
                return;
            }
            let SSH = loginServiceResult.SSH;
            const deployProjectToRomtePromise = service.common.basedeploy.deployProjectToRomte(SSH,{projectName,webhookLocalPath,serviceProjectPath,projectPath,buildPath}, link3);
            const deployProjectToRomteResult = yield deployProjectToRomtePromise.then((res) => {
                return res;
            }).catch((res) => {
                if (res && res.status !== undefined)
                    return res;
                else
                    return {
                        deployStatus: -2,
                        msg: `${projectName} 代码部署远程服务器出错：${String(res)}`,
                        status: false,
                        error: res.toString()
                    }
            });
            link3OutOut.msg = deployProjectToRomteResult.msg;
            if (!deployProjectToRomteResult.status) {
                deployInfo = Object.assign({}, deployInfo, deployProjectToRomteResult);
                yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                link3OutOut.done = true;
                Socket.emit('deployError', link3OutOut);
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
                Socket.emit('deploySuccess', link3OutOut);
            }
            /*
            * 环节四 部署项目代码 备份 并检测是否备份过该分支
            * 1、检查该项目是否在FE_BFK上创建过
            * Y 检查是否备份过 该分支
            * N 创建该备份项目 提交 README.md 到 master；创见分支备份指定build文件；
            * */
            // 检查 该项目是否备份过
            let link4OutOut = {
                link: 4
            };
            let checkProjectIsBack = yield service.common.basedeploy.checkProjectIsBackGitlab(projectInfo, token, link4);
            let projectBack = null, isBackBranch;
            if(checkProjectIsBack.status){
                projectBack = checkProjectIsBack.data;
            };
            /*
            *  如果该项目已经在FE_BFK 上创建了；检查是否 备份该版本
            * */
            if(projectBack){
                isBackBranch = yield service.common.basedeploy.checkProjectIsBackBranch(projectBack.id, projectInfo, token, link4);
                if(isBackBranch.status) { // 已经备份过该版本
                    deployInfo = Object.assign({}, deployInfo, deployProjectToRomteResult,{deployStatus: 500});
                    yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                    link4OutOut.done = true;
                    link4OutOut.msg = `${projectName} 已部署完成，已备份完成`;
                    Socket.emit('deploySuccess', link4OutOut);
                    // 还原本地 git checkout .
                    Git.checkout('.');
                    return;
                }
            }
            const backProjectToGitlab= service.common.basedeploy.backProjectToGitlab(projectInfo, projectBack, {token,buildPath:packageResult.data.buildPath}, link4);
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
            link4OutOut.msg = deployInfo.msg || deployInfo.error;
            // 还原本地 git checkout .
            Git.checkout('.')
            if(backProjectToGitlabResult.status){
                Socket.emit('deploySuccess', link4OutOut);
            } else {
                Socket.emit('deployError', link4OutOut);
            }
        }
        /*
        * 环节 一
        * 1、检查配置项是否完整
        * 2、声明必要的参数变量
        * 3、缓存参数变量
        * */
        /** link1() {
            const { ctx, app, service } = this;
            const { token } = ctx.query;
            const Socket = ctx.socket;
            const webhookId = ctx.args[0];
            const serviceId = ctx.args[1];
            if(!token || !webhookId || !serviceId){
                Socket.emit('deployError',{msg:'授权失败'});
                return;
            }
            let webhookResult = yield service.common.common.baseSelect(this.tableWebhookName, '*', {id: webhookId});
            let serviceResult = yield service.common.common.baseSelect(this.tableServiceName,'*',{id:serviceId});
            let webhookConfigResult = yield service.common.common.baseSelect(this.tableWebhookConfigName, ['saveProjectPath'], {webhookId});
            if (!webhookResult.status || !serviceResult.status || !webhookConfigResult.status) {
                Socket.emit('deployError',{msg:'请检查应用服务器部署文件路径是否配置完成'});
                return;
            } else {
                Socket.emit('deploySuccess', {msg:"应用服务器部署文件路径配置完整"})
            };
            let projectInfo = webhookResult.data[0]; serviceResult = serviceResult.data[0];
            let deployInfo = {
                serviceAccount: serviceResult['account'],
                serviceIp: serviceResult['ip'],
                ip:serviceResult.ip,
                serviceId: serviceId,
                webhookId: webhookId
            };
            /!*
            * 声明 必要的参数变量
            * *!/
            // webhook 服务器本地存储项目地址
            let webhookLocalPath = webhookConfig.projectDeploy[`gitCloneLocalPath_${EGG_SERVER_ENV?EGG_SERVER_ENV:'prod'}`];
            let serviceProjectPath = serviceResult.saveProjectPath;// 服务器配置的 应用 存储地址
            let projectPath = webhookConfigResult.data[0]?webhookConfigResult.data[0].saveProjectPath: ''; // 应用配置的 部署项目地址
            let projectName = projectInfo.projectName; //项目名称
            const packageResult = yield service.common.basedeploy.checkPackageJSON(projectInfo.webUrl, token);
            let buildPath = packageResult.data?packageResult.data.buildPath:'';

            let outPut = {
                status: !!packageResult.status,
                link: 'link1'
            };
            if (!packageResult.status || !packageResult.data || !buildPath) {
                deployInfo.deployStatus= -1;
                deployInfo.error = `请检查${projectName}项目package.json 中 webhook 是否配置完整`;
                deployInfo.msg = `请检查${projectName}项目package.json 中 webhook 是否配置完整`;
                yield service.common.basedeploy.saveDelpoyLog(projectInfo,deployInfo);
                outPut.msg = deployInfo.msg;
                Socket.emit('deployError', outPut);
            } else {
                // 设置缓存
                let cache = {
                    webhookId,
                    serviceId,
                    webhookLocalPath, // webhook 本地服务器 存储项目路径
                    serviceProjectPath, // 服务器部署文件 路径
                    projectPath, // 应用配置部署项目地址
                    projectInfo, // 应用基本信息
                    serviceResult, // 部署服务器基本信息
                    deployInfo, // 部署结果基本信息
                    buildPath
                };
                cache = JSON.stringify(cache);
                yield app.redis.set(`${token}_${webhookId}_${serviceId}`, cache);
                outPut.msg = '配置项查完成，服务器，webhook，package.json配置项完整';
                Socket.emit('deploySuccess',outPut);
            }
        }*/
        /*
        * 环节二
        * 克隆代码到本地
        * */
        /** link2() {
            const { ctx, app, service } = this;
            const { token } = ctx.query;
            const Socket = ctx.socket;
            const webhookId = ctx.args[0];
            const serviceId = ctx.args[1];
            let info = yield app.redis.get(`${token}_${webhookId}_${serviceId}`);
            if(info){
                info = JSON.parse(info);
            }
            let {projectInfo, deployInfo} = info;
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
            let outPut = {
                link: 'link2',
                msg:gitProjectResult.msg,
                status: !!gitProjectResult.status
            };
            if (!gitProjectResult.status) {
                deployInfo = Object.assign({}, deployInfo, gitProjectResult);
                yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                Socket.emit('deployError', outPut);
                return;
            } else {
                info.gitLocalPath  = gitProjectResult.gitLocalPath;
                yield app.redis.set(`${token}_${webhookId}_${serviceId}`, JSON.stringify(info));
                Socket.emit('deploySuccess', outPut);
            }
        }*/
        /*
        * 环节三 写入文件 版本 时间戳
        * */
        /** link3() {
            const { ctx, app, service } = this;
            const { token } = ctx.query;
            const Socket = ctx.socket;
            const webhookId = ctx.args[0];
            const serviceId = ctx.args[1];
            let info = yield app.redis.get(`${token}_${webhookId}_${serviceId}`);
            if(info){
                info = JSON.parse(info);
            }
            // console.log(info);
            let {projectInfo,webhookLocalPath, buildPath} = info;
            let pushBuildPath = '/'+parsePath(webhookLocalPath,projectInfo.projectName, buildPath);
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
            console.log(`============>${writeFileResult.msg}`);
            let outPut = {
                link: 'link3',
                msg: writeFileResult.msg,
                status: !!writeFileResult.status
            };
            if(writeFileResult.status){
                Socket.emit('deploySuccess', outPut);
            } else {
                Socket.emit('deployError', outPut);
            }
        }*/
        /*
        * 环节四
        * 登录远程服务器
        * */
        /** link4() {
            const { ctx, app, service } = this;
            const { token } = ctx.query;
            const Socket = ctx.socket;
            const webhookId = ctx.args[0];
            const serviceId = ctx.args[1];
            let info = yield app.redis.get(`${token}_${webhookId}_${serviceId}`);
            if(info){
                info = JSON.parse(info);
            }
            let {projectInfo,deployInfo,serviceResult, gitLocalPath, webhookLocalPath, serviceProjectPath, projectPath, buildPath} = info;
            let Git = SimmpleGit(gitLocalPath);
            let {projectName} = projectInfo;
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
                    msg: `${projectName} 登录远程服务器出错：${String(res)}`
                }
            });
            let SSH = loginServiceResult.SSH;
            let outPut1 = {
                status: !!loginServiceResult.status,
                msg: loginServiceResult.msg
            };
            if(!loginServiceResult.status) {
                deployInfo = Object.assign({}, deployInfo, loginServiceResult);
                yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                Socket.emit('deployError', outPut1);
                return;
            } else {
                Socket.emit('deploySuccess', outPut1);
            }
            // 部署文件到远程
            const deployProjectToRomtePromise = service.common.basedeploy.deployProjectToRomte(SSH,{projectName,webhookLocalPath,serviceProjectPath,projectPath,buildPath});
            const deployProjectToRomteResult = yield deployProjectToRomtePromise.then((res) => {
                return res;
            }).catch((res) => {
                if (res && res.status !== undefined)
                    return res;
                else
                    return {
                        deployStatus: -2,
                        msg: `${projectName} 代码部署远程服务器出错：${String(res)}`,
                        status: false,
                        error: res.toString()
                    }
            });
            let outPut2 = {
                status:!!deployProjectToRomteResult.status,
                msg: deployProjectToRomteResult.msg
            };
            if (!deployProjectToRomteResult.status) {
                deployInfo = Object.assign({}, deployInfo, deployProjectToRomteResult);
                yield service.common.basedeploy.saveDelpoyLog(projectInfo, deployInfo);
                Socket.emit('deployError', outPut2);
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
                Socket.emit('deploySuccess', outPut2);
                // 还原本地 git checkout .
                Git.checkout('.');
            }
        }*/
    }
    return deployProject;
};
