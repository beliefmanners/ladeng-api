const webhookConfig = require('../../../.webhookconfig.json');
const EGG_SERVER_ENV = process.env.EGG_SERVER_ENV ? process.env.EGG_SERVER_ENV : 'local';
const shell = require('shelljs');
const { parsePath } = require('../../until/index');
module.exports = app => {
  class BackController extends app.Controller {
      constructor(props) {
          super(props);
          this.tableUserName = 'TW_user';
          this.tableWebhookServiceDeployName = 'TW_webhook_service_deploy';
      }
      * getBranch(ctx) {
          let { token } = ctx.request.headers;
          if(!token){
              this.error('授权失败');
              return;
          }
          let {projectId} = ctx.query;
          if(!projectId) {
              this.error('参数有误');
              return;
          }
          let { service } = this;
          let backResult = yield service.common.common.baseSelect(this.tableWebhookBackName,['projectBackId', 'gitBackSshUrl'], {projectId});
          if(!backResult.status){
              this.error(backResult.msg);
              return;
          }
          let projectBackId = backResult.data[0].projectBackId;
          let result = yield this.ctx.curl(`${this.baseUrl}/projects/${projectBackId}/repository/branches?private_token=${token}`,{
              method: 'GET',
              dataType: 'json'
          });
          if(result.status < 300){
              this.success({
                  data: result.data,
                  gitBackSshUrl: backResult.data[0].gitBackSshUrl
              })
          } else {
              this.error(result.data.message);
          }
      }
      * rollBackProject(ctx) {
          let { token } = ctx.request.headers;
          if(!token){
              this.error('授权失败');
              return;
          }
          let { service } = this;
          let query = ctx.request.body;
          let { gitTags,userId, serviceAccount,projectId ,gitBackSshUrl,saveProjectPath ,serviceIp, sshKey, projectName} = query;
          if(!projectName ||!userId || !gitTags ||!projectId || !gitBackSshUrl || !saveProjectPath || !serviceAccount || !serviceIp || !sshKey) {
              this.error('参数有误');
              return;
          }
          //项目容器路径
          let projectDockerBackPath = webhookConfig.projectDeploy[`gitBackLocalPath_${EGG_SERVER_ENV?EGG_SERVER_ENV:'prod'}`];
          let projectBackPath = '/'+ parsePath(projectDockerBackPath,projectName);
          /*
          * 环节一 检查是否有该项目的 备份 git 文件
          * */
          let backParjectCode = shell.find(projectBackPath).code;
          if(backParjectCode){ // 不存在备份项目
                shell.cd('/'+parsePath(projectDockerBackPath));
                shell.mkdir(projectName);
                let cloneProjectPromise = service.webhook.rollBack.cloneProject(projectDockerBackPath,projectBackPath, projectName, gitBackSshUrl);
                let cloneProject = yield cloneProjectPromise.then((res) => {
                    return res;
                }).catch((res) => {
                    if(res.status === undefined) {
                        return {
                            status: false,
                            deployStatus: 601,
                            msg: `${projectName} 项目回滚，git clone 失败 ${String(res)}`,
                            error: res
                        }
                    }
                    return res;
                });
              if(!cloneProject.status){
                  yield service.common.basedeploy.saveDelpoyLog(Object.assign({}, query, cloneProject));
                  this.error(cloneProject.msg);
                  return;
              }
          };

          /*
          * 环节二 切换分支
          * */
          let checkoutPromise = service.webhook.rollBack.checkout(gitTags, projectName, projectBackPath);
          let checkoutResult = yield checkoutPromise.then((res) => {
              return res;
          }).catch((res) => {
              if(res.status === undefined) {
                  return {
                      status: false,
                      deployStatus:603 ,
                      msg: `${projectName}切换分支${gitTags}失败：${String(res)}`,
                      error: res
                  }
              }
              return res;
          });
          let Git = checkoutResult.Git;
          if(!checkoutResult.status){
              yield service.common.basedeploy.saveDelpoyLog(Object.assign({}, query, checkoutResult));
              Git.checkout('master');
              this.error(checkoutResult.msg);
              return;
          }
          /*
          * 环节三 写入文件 版本
          * */
          const writeFilePromise = service.common.basedeploy.addTagAndDate(projectBackPath,gitTags);
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
          /*
          * 环节四 登录服务器
          * */
          let loginServicePromise = service.common.basedeploy.loginService({account:serviceAccount, ip:serviceIp, sshKey});
          let loginServiceResult = yield loginServicePromise.then((res) => {
              return res;
          }).catch((res) => {
              if(res.status === undefined) {
                  return {
                      msg: `ip:${ip},accpunt:${account};登录失败 ${String(res)}`,
                      status: false,
                      error: String(res),
                      deployStatus: 602
                  }
              }
              res.deployStatus = 602;
              return res;
          });
          if(!loginServiceResult.status) {
              yield service.common.basedeploy.saveDelpoyLog(Object.assign({}, query, loginServiceResult));
              Git.checkout('master');
              this.error(loginServiceResult.msg);
              return;
          }
          /*
          * 环节四 开始部署
          * */
          let SSH = loginServiceResult.SSH;
          let rollBackProjectPromise = service.webhook.rollBack.rollBackProject(query,projectBackPath, SSH);
          let backResult = yield rollBackProjectPromise.then((res) =>{
              return res;
          }).catch((res) => {
              if(res.status === undefined){
                  return {
                      status: false,
                      msg: `${projectName} 项目部署失败，${String(res)}`,
                      deployStatus: 601
                  };
              } else{
                  res.deployStatus = 601;
                  return res;
              }
          });
          Git.checkout('master');
          yield service.common.basedeploy.saveDelpoyLog(Object.assign({}, query, backResult));
          if(backResult && backResult.status) {
              this.success(backResult.msg);
          } else {
              this.error(backResult.msg);
          }
      }
  }
  return BackController;
};
