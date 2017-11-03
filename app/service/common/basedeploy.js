'use strict';
const shell = require('shelljs');
const SimmpleGit = require('simple-git');
const path = require('path');
const node_ssh = require('node-ssh');
const webhookConfig = require('../../../.webhookconfig.json');
const EGG_SERVER_ENV = process.env.EGG_SERVER_ENV ? process.env.EGG_SERVER_ENV : 'local';
const fs = require('fs');
const { parsePath, formatDate } = require('../../until/index');
module.exports = app => {
    class BaseService extends app.Service {
        constructor(props) {
            super(props);
            this.tableWebhookDeployLogName = 'TW_webhook_deploy_log';
            this.tableWebhookServiceDeployName = 'TW_webhook_service_deploy';
            this.tableWebhookName = 'TW_webhook';
            this.tableWebhookBackName = 'TW_webhook_back'
        }
        /*
        *  登录服务器
        * */
        loginService({ip, account, sshKey}, socketEvent) {
            const SSH = new node_ssh();
            const Socket = this.ctx.socket;
            let outPut = {
                link: socketEvent
            }, num = 1;
            const LoginService = new Promise((resolve, reject) => {
                console.log(`=========>>开始登录远程服务器：ip:${ip};account:${account};sshKey:${sshKey}`);
                if(socketEvent){
                    outPut.msg = `开始登录远程服务器：ip:${ip};account:${account};sshKey:${sshKey}`;
                    num ++;
                    setTimeout(() => {
                        Socket.emit(socketEvent, outPut)
                    }, num * 100)
                }
                SSH.connect({
                    host: ip,
                    username: account,
                    privateKey: sshKey
                }).then((res) => {
                    console.log('=========>>服务器登录成功');
                    if(socketEvent){
                        outPut.msg = `服务器登录成功：ip:${ip};account:${account};sshKey:${sshKey}`;
                        num ++;
                        setTimeout(() => {
                            Socket.emit(socketEvent, outPut);
                            resolve({
                                msg: '登录成功',
                                status: true,
                                data: res,
                                SSH
                            })
                        }, num * 100)
                    } else {
                        resolve({
                            msg: '登录成功',
                            status: true,
                            data: res,
                            SSH
                        })
                    }

                }).catch(err => {
                    console.log('=========>>服务器登录失败', err.toString());
                    if(socketEvent){
                        outPut.msg = `服务器登录失败 ${err.toString()}`;
                        num ++;
                        setTimeout(() => {
                            Socket.emit(socketEvent, outPut);
                            reject({
                                msg: `ip:${ip},accpunt:${account};登录失败 ${String(err)}`,
                                status: false,
                                deployStatus: 300,
                                error: String(err)
                            });
                        }, num * 100);
                    } else {
                        reject({
                            msg: `ip:${ip},accpunt:${account};登录失败 ${String(err)}`,
                            status: false,
                            deployStatus: 300,
                            error: String(err)
                        });
                    }
                });
            });
            return LoginService;
        }
        /*
        *  检测 package.json 配置项
        * */
        * checkPackageJSON(webUrl, token, socketEvent) {
            let packag;
            const Socket = this.ctx.socket;
            let outPut = {
                link: socketEvent
            };

            if(socketEvent) {
                outPut.msg = `开始检查应用package.json 是否配置webhook字段`;
                Socket.emit(socketEvent, outPut)
            }
            try {
                packag =yield this.app.curl(`${webUrl}/raw/master/package.json?private_token=${token}`,{
                    dataType: 'json',
                    method: 'GET'
                });
            } catch (err) {
                packag = {
                    status: 500,
                    data: {
                        message: String(err)
                    }
                }
            }
            let webhookConfig;
            if (packag.status <300) {
                webhookConfig = {
                    status: true,
                    data: packag.data.webhook
                };
            } else {
                webhookConfig = {
                    status: false,
                    data: packag.data
                }
            }
            if(socketEvent) {
                outPut.msg = webhookConfig.status?'配置完整': `配置不完整${webhookConfig.data.message || ''}`;
                Socket.emit(socketEvent, outPut)
            }
            return webhookConfig ;
        }
        /*
        * git clone / pull 代码到本地
        * 定义 项目存储的本地位置
        * cd 项目存储的文件夹下 并获取当前目录绝对路径 赋值给 变量 shell_pwd_stdout
        * 查询当前目录是否有该项目 如果有 git pull 没有 git clone
        * 定义项目 拉取和clone permise 函数
        * git pull
        * cd 到 项目所在目录 pull
        * git clone
        * 创建以项目名称命名的文件夹
        * */
        gitConleToLocal(projectInfo, socketEvent) {
            const Socket = this.ctx.socket;
            let projectName = projectInfo.projectName;
            let webhookLocalPath = webhookConfig.projectDeploy[`gitCloneLocalPath_${EGG_SERVER_ENV}`] || '/home/hewenshan/yaojiasong/webhook-git';
            webhookLocalPath = '/'+ parsePath(webhookLocalPath);
            shell.cd(webhookLocalPath);
            const shell_code_project_name = shell.find(projectInfo.projectName).code;
            const localPath = '/'+parsePath(webhookLocalPath, projectInfo.projectName);
            let outPut = {
                link: socketEvent
            },  num = 0;
            const result = new Promise((resolve, reject) => {
                if (shell_code_project_name === 0){
                    console.log('=========>>git pull 开始');
                    console.log(`=========>>存储文件路径 ：${localPath}`);
                    if(socketEvent){
                        outPut.msg = `${projectName}开始拉取文件，文件存储路径：${localPath}`;
                        num ++;
                        setTimeout(() => {
                            Socket.emit(socketEvent, outPut)
                        }, num * 100)
                    }
                    const Git = SimmpleGit(localPath);
                    Git.pull(function(err, res) {
                        if (err) {
                            console.log(`=========>>git pull 失败 ${err.toString()}`);
                            if(socketEvent){
                                outPut.msg = `${projectName}拉取失败${err.toString()}`;
                                num ++;
                                setTimeout(() => {
                                    Socket.emit(socketEvent, outPut);
                                    reject({
                                        status: false,
                                        deployStatus: 201,
                                        msg: `${projectInfo.projectName} git pull ${projectInfo.ssh_url} error: ${err.toString()} 拉取失败`,
                                        error: err.toString(),
                                        gitLocalPath: localPath,
                                        Git
                                    });
                                }, num * 100)
                            } else {
                                reject({
                                    status: false,
                                    deployStatus: 201,
                                    msg: `${projectInfo.projectName} git pull ${projectInfo.ssh_url} error: ${err.toString()} 拉取失败`,
                                    error: err.toString(),
                                    gitLocalPath: localPath,
                                    Git
                                });
                            }
                            return;
                        }
                        if(res && !res.summary.changes){
                            if(socketEvent){
                                outPut.msg =  `${projectName} 代码文件拉取成功，但没有检测到文件变化，请检查是否合并到master分支上`;
                                outPut.done = true;
                                num ++;
                                setTimeout(() => {
                                    Socket.emit(socketEvent, outPut);
                                    reject({
                                        status: false,
                                        deployStatus: 201,
                                        msg: `${projectInfo.projectName} 代码文件拉取失败，请检查是否合并到master分支上`,
                                        gitLocalPath: localPath,
                                        Git
                                    });
                                }, num * 100)
                            } else {
                                reject({
                                    status: false,
                                    deployStatus: 201,
                                    msg: `${projectInfo.projectName} 代码文件拉取失败，请检查是否合并到master分支上`,
                                    gitLocalPath: localPath,
                                    Git
                                });
                            }
                            return;
                        } else {
                            console.log('=========>>git pull 成功');
                            if(socketEvent){
                                outPut.msg =  `${projectName}拉取成功`;
                                outPut.done = true;
                                num ++;
                                setTimeout(() => {
                                    Socket.emit(socketEvent, outPut);
                                    resolve({
                                        status: true,
                                        msg: ` ${projectInfo.projectName} git pull 拉取成功`,
                                        gitLocalPath: localPath,
                                        Git
                                    });
                                }, num * 100)
                            } else {
                                resolve({
                                    status: true,
                                    msg: ` ${projectInfo.projectName} git pull 拉取成功`,
                                    gitLocalPath: localPath,
                                    Git
                                });
                            }
                        }
                    });
                } else {
                    const Git = SimmpleGit(); // 克隆文件
                    console.log(`=========>>git clone 开始 ${projectInfo.sshUrl}`);
                    console.log(`=========>>存储文件路径： ${localPath}`);
                    if(socketEvent){
                        outPut.msg =  `${projectName} 开始克隆代码文件，sshUrl：${projectInfo.sshUrl}，文件存储路径： ${localPath}`;
                        num ++;
                        setTimeout(() => {
                            Socket.emit(socketEvent, outPut)
                        }, num * 100)
                    }
                    shell.mkdir(projectInfo.projectName);
                    Git.clone(projectInfo.sshUrl, localPath, function(err) {
                        if (err) {
                            console.log(`=========>>git clone 失败 ${err.toString()}`);
                            if(socketEvent){
                                outPut.msg = `${projectName} 克隆失败；${err.toString()}`;
                                outPut.done = true;
                                num ++;
                                setTimeout(() => {
                                    Socket.emit(socketEvent, outPut);
                                    reject({
                                        status: false,
                                        deployStatus: 200,
                                        msg: `${projectInfo.projectName} git clone  ${projectInfo.ssh_url} error:${err.toString()} 克隆失败`,
                                        error: err.toString(),
                                        gitLocalPath: localPath,
                                        Git
                                    });
                                }, num * 100)
                            } else {
                                reject({
                                    status: false,
                                    deployStatus: 200,
                                    msg: `${projectInfo.projectName} git clone  ${projectInfo.ssh_url} error:${err.toString()} 克隆失败`,
                                    error: err.toString(),
                                    gitLocalPath: localPath,
                                    Git
                                });
                            }
                        } else {
                            console.log('=========>>git clone 成功');
                            if(socketEvent){
                                outPut.msg = `${projectName} 克隆成功；`;
                                outPut.done = true;
                                num ++;
                                setTimeout(() => {
                                    Socket.emit(socketEvent, outPut);
                                    resolve({
                                        status: true,
                                        msg: `${projectInfo.projectName} git clone 克隆成功`,
                                        gitLocalPath: localPath,
                                        Git
                                    });
                                }, num * 100)
                            } else {
                                resolve({
                                    status: true,
                                    msg: `${projectInfo.projectName} git clone 克隆成功`,
                                    gitLocalPath: localPath,
                                    Git
                                });
                            }
                        }
                    });
                }
            });
            return result;
        }
        /*
        * 添加index 文件 版本号 和 日期
        * */
        addTagAndDate(buildPath, gitTags, socketEvent) {
            const Socket = this.ctx.socket;
            let outPut = {
                link: socketEvent,
                msg: '开始读取应用 index.html文件'
            }, num =0;
            let result = new Promise((resolve, reject) => {
                let indexCode = shell.find(buildPath+'/index.html').code;
                if(socketEvent) {
                    num ++;
                    setTimeout(() => {
                        Socket.emit(socketEvent, outPut)
                    }, num * 100)
                }
                if(indexCode) {
                    if(socketEvent){
                        outPut.msg = `没有查询到 webhook buildPath：中的index.html文件`;
                        num ++;
                        setTimeout(() => {
                            Socket.emit(socketEvent, outPut);
                            resolve({
                                status: true,
                                msg:`没有查询到 webhook buildPath：${buildPath} 中的index.html文件 `
                            });
                        }, num * 100);
                    } else {
                        resolve({
                            status: true,
                            msg:`没有查询到 webhook buildPath：${buildPath} 中的index.html文件 `
                        });
                    }
                } else {
                    let now = formatDate(new Date(), 'YYYYMMDDhhmmss');
                    fs.readFile(buildPath+'/index.html', {flag: 'r+', encoding: 'utf8'}, function(err, str) {
                        if(err){
                            if(socketEvent){
                                let outPut = {
                                    msg: `index.html文件读取失败${err.toString()}`,
                                    link: socketEvent,
                                };
                                Socket.emit(socketEvent, outPut);
                            }
                            reject({
                                status: false,
                                msg: err.toString()
                            });
                            return;
                        }
                        str = str.replace(/((src\S*.js)|(href\S*.css))"/g,`$1?v=${gitTags}&date=${now}"`);
                        str = str.replace(/(<head>)/,`$1 \n \t <meta name="date" content="${now}"/>`);

                        str = str.replace(/(<head>)/,`$1 \n \t <meta name="version" content="${gitTags}"/>`);
                        fs.writeFile(buildPath + '/index.html', str,  function (err) {
                            if(err) {
                                if(socketEvent){
                                    outPut.msg = ` index.html文件写入失败${err.toString()}`;
                                    outPut.done = true;
                                    num ++;
                                    setTimeout(() => {
                                        Socket.emit(socketEvent, outPut);
                                        reject({
                                            status: false,
                                            msg: `文件写入失败 version:${gitTags}, date: ${now}, ${err.toString()}`
                                        })
                                    }, num * 100);
                                } else {
                                    reject({
                                        status: false,
                                        msg: `文件写入失败 version:${gitTags}, date: ${now}, ${err.toString()}`
                                    })
                                }
                            } else {
                                if(socketEvent){
                                    outPut.msg = `index.html文件写入成功;version:${gitTags},date:${now}`;
                                    outPut.done = true;
                                    num ++;
                                    setTimeout(() => {
                                        Socket.emit(socketEvent, outPut);
                                        resolve({
                                            status: true,
                                            msg: `文件写入成功 version:${gitTags}, date: ${now}`
                                        })
                                    }, num * 100);

                                } else {
                                    resolve({
                                        status: true,
                                        msg: `文件写入成功 version:${gitTags}, date: ${now}`
                                    })
                                }

                            }
                        });
                    })
                }
            });
            return result;
        }
        /*
        * 部署项目到远程
        * */
        deployProjectToRomte(SSH, {projectName,webhookLocalPath,serviceProjectPath, projectPath,buildPath}, socketEvent) {
            const Socket = this.ctx.socket;
            buildPath = parsePath(buildPath);
            webhookLocalPath = '/'+ parsePath(webhookLocalPath, projectName,buildPath);
            let saveProjectPath, outPut={link: socketEvent}, num = 0;
            if(projectPath){
                saveProjectPath = '/'+parsePath(projectPath);
            } else {
                saveProjectPath = '/'+parsePath(serviceProjectPath, projectName);
            }

            const result = new Promise((resolve, reject) => {
                console.log('=========>>部署开始');
                console.log(`=========>>上传项目webhook本地地址： ${webhookLocalPath}`);
                console.log(`=========>>上传项目远程服务地址路径： ${saveProjectPath}`);
                if(socketEvent) {
                    outPut.msg = `${projectName}部署开始；webhook本地地址：${webhookLocalPath}；远程服务地址路径${saveProjectPath}`;
                    num ++;
                    setTimeout(() => {
                        Socket.emit(socketEvent, outPut);
                    }, num * 100)
                }
                let failFile = [];
                let successFile = [];
                SSH.putDirectory(webhookLocalPath, saveProjectPath,{
                    recursive: true,
                    concurrency: 100,
                    validate(itemPath) {
                        const baseName = path.basename(itemPath);
                        return baseName.substr(0, 1) !== '.' && // do not allow dot files
                            baseName !== 'node_modules'; // do not allow node_modules
                    },
                    tick(localPath, remotePath, error) {
                        if (error) {
                            failFile.push({
                                local: localPath,
                                remote: remotePath
                            });
                        } else {
                            successFile.push(remotePath);
                        }
                    }
                }).then((status) => {
                    console.log('=========>>目标文件部署', status ? '完成' : '失败');
                    if(socketEvent) {
                        outPut.msg = `${projectName}目标文件部署${status && !failFile.length ? '完成' : '尚未完成，文件二次部署'}；`;
                        setTimeout(() => {
                            Socket.emit(socketEvent, outPut);
                        }, num * 100)
                    }
                    if(failFile.length) {
                        SSH.putFiles(failFile).then(() => {
                            console.log('=========>>目标文件重新部署完成');
                            if(socketEvent) {
                                outPut.msg = `${projectName}目标文件重新部署完成；`;
                                outPut.done = true;
                                num ++;
                                setTimeout(() => {
                                    Socket.emit(socketEvent, outPut);
                                    resolve({
                                        deployStatus: 400,
                                        msg: ` ${projectName} 部署成功`,
                                        status: true,
                                        failFile: "No fail file",
                                        successFile: successFile.concat(failFile).join(',')
                                    })
                                }, num * 100);
                            } else {
                                resolve({
                                    deployStatus: 400,
                                    msg: ` ${projectName} 部署成功`,
                                    status: true,
                                    failFile: "No fail file",
                                    successFile: successFile.concat(failFile).join(',')
                                })
                            }
                        },(err) => {
                            if(socketEvent) {
                                outPut.msg = `${projectName}目标文件重新部署失败；`;
                                outPut.deno = true;
                                num ++;
                                setTimeout(() => {
                                    Socket.emit(socketEvent, outPut);
                                    reject({
                                        deployStatus: 401,
                                        msg: `${projectName} 部署失败 ${err.toString()}; webhookLocalPath:${webhookLocalPath};saveProjectPath:${saveProjectPath}`,
                                        status: false,
                                        failFile: err.toString(),
                                        successFile: successFile.join(',')
                                    })
                                }, num * 100);
                            } else {
                                reject({
                                    deployStatus: 401,
                                    msg: `${projectName} 部署失败 ${err.toString()}; webhookLocalPath:${webhookLocalPath};saveProjectPath:${saveProjectPath}`,
                                    status: false,
                                    failFile: err.toString(),
                                    successFile: successFile.join(',')
                                })
                            }

                        })
                    } else {
                        if(socketEvent) {

                            outPut.msg = `${projectName}目标文件部署成功；`;
                            outPut.deno = true;
                            num ++;
                            setTimeout(() => {
                                Socket.emit(socketEvent, outPut);
                                resolve({
                                    deployStatus: 400,
                                    msg:  ` ${projectName} 部署成功`,
                                    status: true,
                                    failFile: failFile.join(','),
                                    successFile: successFile.join(',')
                                })
                            }, num * 100)

                        } else {
                            resolve({
                                deployStatus: 400,
                                msg:  ` ${projectName} 部署成功`,
                                status: true,
                                failFile: failFile.join(','),
                                successFile: successFile.join(',')
                            })
                        }

                    }
                }).catch((err) => {
                    console.log('=========>>服务器部署 失败 ', err.toString());
                    if(socketEvent) {
                        outPut.msg = `${projectName}服务器部署失败；${err.toString()}`;
                        outPut.deno = true;
                        num ++;
                        setTimeout(() => {
                            Socket.emit(socketEvent, outPut);
                            reject({
                                deployStatus: 401,
                                status: false,
                                error: `${projectName} 部署失败 ${err.toString()}; webhookLocalPath:${webhookLocalPath};saveProjectPath:${saveProjectPath}`,
                                msg: `${projectName} 部署失败 ${err.toString()}; webhookLocalPath:${webhookLocalPath};saveProjectPath:${saveProjectPath}`
                            })
                        }, num * 100)

                    } else {
                        reject({
                            deployStatus: 401,
                            status: false,
                            error: `${projectName} 部署失败 ${err.toString()}; webhookLocalPath:${webhookLocalPath};saveProjectPath:${saveProjectPath}`,
                            msg: `${projectName} 部署失败 ${err.toString()}; webhookLocalPath:${webhookLocalPath};saveProjectPath:${saveProjectPath}`
                        })
                    }
                })
            });
            return result;
        }
        /*
        * 保存部署日志
        * */
        * saveDelpoyLog(projectInfo, deployInfo) {
            let allField = Object.assign({}, projectInfo, deployInfo);
            const deployStatusText = {
                "-2":"未知错误",
                "-1":"没有查询到该项目package.json webhook配置项",
                "0": "尚未部署",
                "100": "部署失败",
                "200": "git clone项目失败",
                "201": "git pull项目失败",
                "202": "git 代码下载失败",
                "203": "本地代码克隆到远程失败",
                "300": "登录服务器失败",
                "400": "服务器部署成功",
                "401": "服务器部署失败",
                "500": "项目备份成功",
                "501": "项目备份失败",
                "502": "项目备份拉取失败",
                "600": "回滚完成",
                "601": "回滚失败",
                "602": "回滚项目 git clone 失败",
                "603": "回滚项目 切换分支失败",
                "604": "回滚项目 登录服务器失败"
            };
            let projectField = ["projectId","projectName","userId","userName","sshUrl","webUrl","serviceId","gitTags"];
            let deployInfoField = ["serviceIp","serviceAccount","deployStatus","error","failFile","successFile","gitBackSshUrl"];
            let deployLogConfig = {
                createdTime: new Date(),
                deployStatusText:deployStatusText[allField.deployStatus] || allField.msg || '未知错误',
                remark: allField.msg || allField.description
            };
            projectField.map((key) => {
                if (allField[key]) {
                    deployLogConfig[key] = allField[key];
                }
            });
            deployInfoField.map((key) => {
                if (allField[key]) {
                    deployLogConfig[key] = allField[key];
                }
            });
            // 插入 部署日志
            let resultId = yield this.knex(this.tableWebhookDeployLogName).insert(deployLogConfig);
            // 更新webhook 部署日志
            try {
                const webhook_deploy_config = {
                    deployStatus: allField.deployStatus,
                    deployStatusText:deployStatusText[allField.deployStatus] || allField.msg || '未知错误',
                    deployLogId: resultId[0],
                    updateTime: new Date(),
                    isSuccess: allField.deployStatus === 500 || allField.deployStatus=== 600? 1: 0
                };
                if(allField.deployStatus === 500 || allField.deployStatus === 600) {
                    webhook_deploy_config.gitTags = allField.gitTags;
                };
                yield this.knex(this.tableWebhookServiceDeployName).update(webhook_deploy_config).where({
                    webhookId: allField.webhookId || allField.id,
                    serviceId: allField.serviceId,
                    projectId: allField.projectId
                })
            } catch (err){
                console.error(err);
            }
        }

        /*=======================  项目相关备份 API  ========================*/
        /*
        * 检查项目是否备份到gitlab 上
        * */
        * checkProjectIsBackGitlab(projectInfo,token, socketEvent){
            const Socket = this.ctx.socket;
            const { projectName } = projectInfo;
            let outPut = {link: socketEvent}, num  = 0;
            if(socketEvent) {
                outPut.msg = `开始检查${projectInfo.projectName}是否备份在FE_BFK上`;
                Socket.emit(socketEvent, outPut)
            }
            try {
                let result = yield this.ctx.curl(`${this.baseUrl}/groups/137/projects?private_token=${token}`,{
                    method:'GET',
                    dataType:'json'
                });
                if(result.status < 300) {
                    let arr = result.data;
                    let projectBack = null;
                    for (let i =0;i<arr.length; i++) {
                        if(arr[i].name === projectInfo.projectName) {
                            if(socketEvent) {
                                outPut.msg = `FE_BFK 是否备份${projectName}项目检测完成`;
                                Socket.emit(socketEvent, outPut)
                            }
                            projectBack = arr[i];
                            return {
                                status: true,
                                data: arr[i]
                            };
                        }
                    }
                    if(socketEvent) {
                        outPut.msg =  `FE_BFK 没有查询到${projectInfo.projectName} 备份项目`;
                        Socket.emit(socketEvent, outPut)
                    }
                    return {
                        status: false,
                        msg: `没有查询到${projectInfo.projectName} 备份项目`
                    }
                } else {
                    if(socketEvent) {
                        outPut.msg = `FE_BFK 是否备份${projectName}项目检查失败：${result.data.message}`;
                        Socket.emit(socketEvent, outPut)
                    }
                    return {
                        status: false,
                        msg: result.data.message
                    }
                }
            } catch (err) {
                if(socketEvent) {
                    outPut.msg `FE_BFK 是否备份${projectName}项目检查失败：${String(err)}`;
                    Socket.emit(socketEvent, outPut)
                }
                return {
                    status:false,
                    msg: `FE_BFK 项目备份检查失败：${String(err)}`
                }
            }
        }
        /*
        * 检查项目是否备份过 该分支
        * */
        * checkProjectIsBackBranch(projectBackId, {gitTags, projectName}, token, socketEvent) {
            const Socket = this.ctx.socket;
            let outPut = {
                msg: `开始检查${projectName}是否备份过${gitTags}分支`,
                link: socketEvent
            };

            if(socketEvent){
                Socket.emit(socketEvent, outPut);
            }
            let BranchResult = yield this.ctx.curl(`${this.baseUrl}/projects/${projectBackId}/repository/branches?private_token=${token}`,{
                method: 'GET',
                dataType: 'json'
            });
            if(BranchResult.status < 300) {
                let arr = BranchResult.data;
                for (let i = 0;i < arr.length; i ++) {
                    if(arr[i].name === gitTags) {
                        outPut.msg = `${projectName}已经备份过${gitTags}分支`;
                        outPut.done = true;
                        if(socketEvent){
                            Socket.emit(socketEvent, outPut);
                        }
                        return {
                            status: true,
                            data: arr[i]
                        }
                    }
                }
                outPut.msg = `${projectName}没有查询到${gitTags}分支的备份`;
                if(socketEvent){
                    Socket.emit(socketEvent, outPut);
                }
                return {
                    status: false,
                    msg: `没有查询到${gitTags}分支的备份`
                }
            } else {
                outPut.msg = `${projectName}没有查询到${gitTags}分支的备份`;
                if(socketEvent){
                    Socket.emit(socketEvent, outPut);
                }
                return {
                    status: true,
                    msg: `${projectName}没有查询到${gitTags}分支的备份`
                }
            }
        }
        /*
        * 1、检查项目是否备份到 webhook 本地
        * 2、打一个tag标签 并提交
        * */
        backProjectToGitlab(projectInfo, projectBack, {token, buildPath}, socketEvent){
            const Socket = this.ctx.socket;
            let { projectName , gitTags} = projectInfo;
            let localBackProjectPath =  webhookConfig.projectDeploy[`gitBackLocalPath_${process.env.EGG_SERVER_ENV?process.env.EGG_SERVER_ENV:'prod'}`];
            let webhookLocalPath = webhookConfig.projectDeploy[`gitCloneLocalPath_${EGG_SERVER_ENV?EGG_SERVER_ENV:'prod'}`];
            buildPath = parsePath(buildPath);
            shell.cd(localBackProjectPath);
            let localPath ='/'+ parsePath(localBackProjectPath, projectInfo.projectName) ;
            let pushBuildPath = '/' + parsePath(webhookLocalPath,projectInfo.projectName, buildPath );
            console.log(`=========>>项目备份 webhook 本地路径: ${webhookLocalPath}`);
            console.log(`=========>>pushBuildPath ${pushBuildPath}`);
            let outPut = {
                link: socketEvent
            }, num = 0;
            if(socketEvent) {
                outPut.msg = `开始备份${projectName}: webhook 服务本地路径 ${webhookLocalPath}`;
                num ++;
                setTimeout(() => {
                    Socket.emit(socketEvent,outPut)
                }, num * 100)
            }
            let result = new Promise((resolve, reject) => {
                if(projectBack) {
                    let projectNameCode = shell.find(projectInfo.projectName).code;
                    console.log(`=========>>项目git 工作相对路径: ${localPath}`);
                    if(projectNameCode === 1) {
                        shell.mkdir(projectInfo.projectName);
                        let Git = SimmpleGit(localPath);
                        // 1、克隆代码
                        console.log(`=========>>开始克隆 备份代码、git地址: ${projectBack.ssh_url_to_repo}`);
                        if(socketEvent) {
                            outPut.msg = `开始克隆${projectName}备份代码、git地址: ${projectBack.ssh_url_to_repo}`;
                            Socket.emit(socketEvent,outPut)
                        }
                        Git.clone(projectBack.ssh_url_to_repo,localPath, (err) => {
                            if(err) {
                                if(socketEvent) {
                                    outPut.msg = `${projectName}备份代码克隆失败、git地址：${projectBack.ssh_url_to_repo}，${err.toString()}`;
                                    outPut.done = true;
                                    num ++;
                                    setTimeout(() => {
                                        Socket.emit(socketEvent,outPut);
                                        reject({
                                            status: false,
                                            deployStatus:502,
                                            msg: `可隆代码失败、git地址：${projectBack.ssh_url_to_repo}，${err.toString()}`,
                                            gitBackSshUrl: projectBack.ssh_url_to_repo,
                                            error: err.toString(),
                                            data:{
                                                gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                projectId: projectInfo.projectId,
                                                gitTags: projectInfo.gitTags,
                                                projectBackId: projectBack.id,
                                                projectName: projectInfo.projectName,
                                                remark: `克隆代码失败、git地址：${projectBack.ssh_url_to_repo}，${err.toString()}`
                                            }
                                        });
                                    }, num * 100)
                                } else {
                                    reject({
                                        status: false,
                                        deployStatus:502,
                                        msg: `可隆代码失败、git地址：${projectBack.ssh_url_to_repo}，${err.toString()}`,
                                        gitBackSshUrl: projectBack.ssh_url_to_repo,
                                        error: err.toString(),
                                        data:{
                                            gitBackSshUrl: projectBack.ssh_url_to_repo,
                                            projectId: projectInfo.projectId,
                                            gitTags: projectInfo.gitTags,
                                            projectBackId: projectBack.id,
                                            projectName: projectInfo.projectName,
                                            remark: `克隆代码失败、git地址：${projectBack.ssh_url_to_repo}，${err.toString()}`
                                        }
                                    });
                                }

                                return;
                            }
                            console.log('=========>>克隆完成');
                            if(socketEvent) {
                                outPut.msg = `${projectName}备份代码克隆完成，开始备份`;
                                Socket.emit(socketEvent,outPut)
                            }
                            // 2、打标签提交
                            Git.checkoutBranch(projectInfo.gitTags, 'master', function (){
                                //3、复制提交代码代码到备份文件夹下
                                shell.cp('-Rf',`${pushBuildPath}/*`, localPath );
                            })
                                .add('./*')
                                .commit(`${projectInfo.gitTags} 版本 备份`)
                                .push(['--set-upstream', 'origin', projectInfo.gitTags], (err) => {
                                    if(err){
                                        if(socketEvent) {
                                            outPut.msg = `${projectName}代码备份失败${err.toString()}`;
                                            outPut.done = true;
                                            num ++;
                                            setTimeout(() => {
                                                Socket.emit(socketEvent,outPut);
                                                reject({
                                                    status: false,
                                                    deployStatus:501,
                                                    msg: `代码备份失败：${err.toString()}`,
                                                    error: `代码备份失败：${err.toString()}`,
                                                    gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                    data:{
                                                        gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                        projectId: projectInfo.projectId,
                                                        gitTags: projectInfo.gitTags,
                                                        projectBackId: projectBack.id,
                                                        projectName: projectInfo.projectName,
                                                        remark:`代码备份失败：${err.toString()}`
                                                    }
                                                });
                                            }, num * 100);

                                        } else {
                                            reject({
                                                status: false,
                                                deployStatus:501,
                                                msg: `代码备份失败：${err.toString()}`,
                                                error: `代码备份失败：${err.toString()}`,
                                                gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                data:{
                                                    gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                    projectId: projectInfo.projectId,
                                                    gitTags: projectInfo.gitTags,
                                                    projectBackId: projectBack.id,
                                                    projectName: projectInfo.projectName,
                                                    remark:`代码备份失败：${err.toString()}`
                                                }
                                            });
                                        }
                                        return;
                                    }
                                    if(socketEvent) {
                                        outPut.msg = `${projectName}备份完成；git地址${projectBack.ssh_url_to_repo};备份版本为：${projectInfo.gitTags}`;
                                        outPut.done = true;
                                        num ++;
                                        setTimeout(() => {
                                            Socket.emit(socketEvent,outPut);
                                            resolve({
                                                deployStatus: 500,
                                                status: true,
                                                gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                msg: `备份完成； 备份版本为：${projectInfo.gitTags}`,
                                                data:{
                                                    gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                    projectId: projectInfo.projectId,
                                                    gitTags: projectInfo.gitTags,
                                                    projectBackId: projectBack.id,
                                                    projectName: projectInfo.projectName,
                                                    remark: `备份完成； 备份版本为：${projectInfo.gitTags}`
                                                }
                                            });
                                        }, num * 100)
                                    } else {
                                        resolve({
                                            deployStatus: 500,
                                            status: true,
                                            gitBackSshUrl: projectBack.ssh_url_to_repo,
                                            msg: `备份完成； 备份版本为：${projectInfo.gitTags}`,
                                            data:{
                                                gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                projectId: projectInfo.projectId,
                                                gitTags: projectInfo.gitTags,
                                                projectBackId: projectBack.id,
                                                projectName: projectInfo.projectName,
                                                remark: `备份完成； 备份版本为：${projectInfo.gitTags}`
                                            }
                                        });
                                    }
                                }).checkout('master')

                        })
                    } else {
                        let Git = SimmpleGit(localPath);
                        if(socketEvent) {
                            outPut.msg = `${projectName}开始备份；版本：${projectInfo.gitTags}`;
                            Socket.emit(socketEvent,outPut)
                        }
                        // 1、打各分支 提交
                        Git.checkoutBranch(projectInfo.gitTags, 'master',function () {
                            // 2、复制代码文件 到 备份目录下
                            shell.cd(projectInfo.projectName);
                            shell.cp('-Rf', `${pushBuildPath}/*`, localPath);
                        })
                            .add('./*')
                            .commit(`${projectInfo.gitTags} 版本 备份`)
                            .push(['--set-upstream', 'origin', projectInfo.gitTags], (err) => {
                                if(err){
                                    if(socketEvent) {
                                        outPut.msg = `${projectName}备份失败；版本：${projectInfo.gitTags}`;
                                        outPut.done = true;
                                        num ++;
                                        setTimeout(() => {
                                            Socket.emit(socketEvent,outPut);
                                            reject({
                                                status: false,
                                                deployStatus: 501,
                                                msg: `代码备份失败：${err.toString()}`,
                                                error: `代码备份失败：${err.toString()}`,
                                                gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                data:{
                                                    gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                    projectId: projectInfo.projectId,
                                                    gitTags: projectInfo.gitTags,
                                                    projectBackId: projectBack.id,
                                                    projectName: projectInfo.projectName,
                                                    remark: `代码备份失败：${err.toString()}`
                                                }
                                            });
                                        }, num * 100)
                                    } else {
                                        reject({
                                            status: false,
                                            deployStatus: 501,
                                            msg: `代码备份失败：${err.toString()}`,
                                            error: `代码备份失败：${err.toString()}`,
                                            gitBackSshUrl: projectBack.ssh_url_to_repo,
                                            data:{
                                                gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                projectId: projectInfo.projectId,
                                                gitTags: projectInfo.gitTags,
                                                projectBackId: projectBack.id,
                                                projectName: projectInfo.projectName,
                                                remark: `代码备份失败：${err.toString()}`
                                            }
                                        });
                                    }
                                    return;
                                }
                                if(socketEvent) {
                                    outPut.msg = `${projectName}备份完成；git地址${projectBack.ssh_url_to_repo};备份版本为：${projectInfo.gitTags}`;
                                    outPut.done = true;
                                    num ++;
                                    setTimeout(() => {
                                        Socket.emit(socketEvent,outPut);
                                        resolve({
                                            status: true,
                                            deployStatus:500,
                                            msg: `代码备份完成、备份版本：${projectInfo.gitTags}；git地址：${projectBack.ssh_url_to_repo}`,
                                            gitBackSshUrl: projectBack.ssh_url_to_repo,
                                            data:{
                                                gitBackSshUrl: projectBack.ssh_url_to_repo,
                                                projectId: projectInfo.projectId,
                                                gitTags: projectInfo.gitTags,
                                                projectBackId: projectBack.id,
                                                projectName: projectInfo.projectName,
                                                remark: `代码备份完成、备份版本：${projectInfo.gitTags}；git地址：${projectBack.ssh_url_to_repo}`
                                            }
                                        })
                                    }, num * 100)
                                } else {
                                    resolve({
                                        status: true,
                                        deployStatus:500,
                                        msg: `代码备份完成、备份版本：${projectInfo.gitTags}；git地址：${projectBack.ssh_url_to_repo}`,
                                        gitBackSshUrl: projectBack.ssh_url_to_repo,
                                        data:{
                                            gitBackSshUrl: projectBack.ssh_url_to_repo,
                                            projectId: projectInfo.projectId,
                                            gitTags: projectInfo.gitTags,
                                            projectBackId: projectBack.id,
                                            projectName: projectInfo.projectName,
                                            remark: `代码备份完成、备份版本：${projectInfo.gitTags}；git地址：${projectBack.ssh_url_to_repo}`
                                        }
                                    })
                                }
                            }).checkout('master')
                    }
                } else { // 首次备份
                    shell.mkdir(projectName);
                    let Git = SimmpleGit(localPath);
                    console.log(`=========>>首次备份${projectInfo.projectName}`);
                    console.log(`=========>>开始创建备份项目${projectInfo.projectName}`);
                    if(socketEvent) {
                        outPut.msg = `${projectName}首次备份；开始在FE_BK上创建备份项目；备份版本为：${gitTags}`;
                        Socket.emit(socketEvent,outPut)
                    }
                    this.axios.post(`${this.baseUrl}/projects?private_token=${token}`,{
                        name: projectInfo.projectName,
                        description: `${projectInfo.projectName} 项目备份`,
                        namespace_id: 137
                    }).then((res) => {
                        console.log(`=========>>创建完成：${projectInfo.projectName}`);
                        console.log(`=========>>开始上传：${projectInfo.projectName}`);
                        if(socketEvent) {
                            outPut.msg = `${projectName}：备份项目创建完成，开始提交备份文件；备份版本为：${gitTags}`;
                            Socket.emit(socketEvent,outPut)
                        }
                        let backProject = res.data;
                        let sshUrl = backProject.ssh_url_to_repo;
                        let readmeCode = shell.find(localPath+'/README.md').code;
                        if(readmeCode === 1){
                            shell.cd(localPath);
                            shell.touch('README.md');
                            fs.writeFile(localPath + '/README.md', "# first commit",  function (err) {
                                if(err) {
                                    console.error(err);
                                } else {
                                    Git.init()
                                        .add('./README.md')
                                        .commit(`${projectInfo.projectName} 备份项目 first commit 版本号：${projectInfo.gitTags}`)
                                        .addRemote('origin', sshUrl)
                                        .push(['-u', 'origin', 'master'],(err) => {
                                            if(err) {
                                                if(socketEvent) {
                                                    outPut.msg = `${projectName}：备份失败，版本：${gitTags}；${err.toString()}`;
                                                    outPut.done = true;
                                                    num ++;
                                                    setTimeout(() => {
                                                        Socket.emit(socketEvent,outPut);
                                                        reject({
                                                            status: false,
                                                            deployStatus:501,
                                                            msg: `项目备份失败：${err.toString()}`,
                                                            error: `项目备份失败：${err.toString()}`,
                                                            data:{
                                                                gitBackSshUrl: sshUrl,
                                                                projectId: projectInfo.projectId,
                                                                gitTags: projectInfo.gitTags,
                                                                projectBackId: backProject.id,
                                                                projectName: projectInfo.projectName,
                                                                remark: `项目备份失败：${err.toString()}`
                                                            }
                                                        });
                                                    }, num * 100);
                                                } else {
                                                    reject({
                                                        status: false,
                                                        deployStatus:501,
                                                        msg: `项目备份失败：${err.toString()}`,
                                                        error: `项目备份失败：${err.toString()}`,
                                                        data:{
                                                            gitBackSshUrl: sshUrl,
                                                            projectId: projectInfo.projectId,
                                                            gitTags: projectInfo.gitTags,
                                                            projectBackId: backProject.id,
                                                            projectName: projectInfo.projectName,
                                                            remark: `项目备份失败：${err.toString()}`
                                                        }
                                                    });
                                                }
                                            }
                                            console.log('上传完成');
                                        })
                                        .checkoutBranch(projectInfo.gitTags, 'master', function() {
                                            shell.cp('-Rf', `${pushBuildPath}/*`, localPath);
                                        })
                                        .add('./*')
                                        .commit(`版本号： ${projectInfo.gitTags}`)
                                        .push(['--set-upstream', 'origin', projectInfo.gitTags], function() {
                                            if(socketEvent) {
                                                outPut.msg = `${projectName}：备份完成，版本：${gitTags}`;
                                                outPut.done = true;
                                                num ++;
                                                setTimeout(() => {
                                                    Socket.emit(socketEvent,outPut);
                                                    resolve({
                                                        status: true,
                                                        deployStatus:500,
                                                        msg: `项目初次备份完成；git：${sshUrl}`,
                                                        gitBackSshUrl: sshUrl,
                                                        data:{
                                                            gitBackSshUrl: sshUrl,
                                                            projectId: projectInfo.projectId,
                                                            gitTags: projectInfo.gitTags,
                                                            projectBackId: backProject.id,
                                                            projectName: projectInfo.projectName,
                                                            remark: `项目初次备份完成；git：${sshUrl}`
                                                        }
                                                    });
                                                }, num * 100);
                                            } else {
                                                resolve({
                                                    status: true,
                                                    deployStatus:500,
                                                    msg: `项目初次备份完成；git：${sshUrl}`,
                                                    gitBackSshUrl: sshUrl,
                                                    data:{
                                                        gitBackSshUrl: sshUrl,
                                                        projectId: projectInfo.projectId,
                                                        gitTags: projectInfo.gitTags,
                                                        projectBackId: backProject.id,
                                                        projectName: projectInfo.projectName,
                                                        remark: `项目初次备份完成；git：${sshUrl}`
                                                    }
                                                });
                                            }
                                            console.log('备份完成', projectInfo.gitTags);
                                        }).checkout('master')
                                }
                            });
                        } else{
                            Git.init()
                                .add('./README.md')
                                .commit(`${projectInfo.projectName} 备份项目 first commit 版本号：${projectInfo.gitTags}`)
                                .addRemote('origin', sshUrl)
                                .push(['-u', 'origin', 'master'],(err) => {
                                    if(err) {
                                        if(socketEvent) {
                                            outPut.msg = `${projectName}：备份失败，版本：${gitTags}；${err.toString()}`;
                                            outPut.done = true;
                                            num ++;
                                            setTimeout(() => {
                                                Socket.emit(socketEvent,outPut);
                                                reject({
                                                    status: false,
                                                    deployStatus:501,
                                                    msg: `项目备份失败：${err.toString()}`,
                                                    error: `项目备份失败：${err.toString()}`,
                                                    data:{
                                                        gitBackSshUrl: sshUrl,
                                                        projectId: projectInfo.projectId,
                                                        gitTags: projectInfo.gitTags,
                                                        projectBackId: backProject.id,
                                                        projectName: projectInfo.projectName,
                                                        remark: `项目备份失败：${err.toString()}`
                                                    }
                                                });
                                            }, num * 100)
                                        } else {
                                            reject({
                                                status: false,
                                                deployStatus:501,
                                                msg: `项目备份失败：${err.toString()}`,
                                                error: `项目备份失败：${err.toString()}`,
                                                data:{
                                                    gitBackSshUrl: sshUrl,
                                                    projectId: projectInfo.projectId,
                                                    gitTags: projectInfo.gitTags,
                                                    projectBackId: backProject.id,
                                                    projectName: projectInfo.projectName,
                                                    remark: `项目备份失败：${err.toString()}`
                                                }
                                            });
                                        }
                                    }
                                })
                                .checkoutBranch(projectInfo.gitTags, 'master',function() {
                                    // 拷贝代码到 localPath
                                    shell.cp('-Rf', `${pushBuildPath}/*`, localPath);
                                })
                                .add('./*')
                                .commit(`版本号： ${projectInfo.gitTags}`)
                                .push(['--set-upstream', 'origin', projectInfo.gitTags], function() {
                                    if(socketEvent) {
                                        outPut.msg = `${projectName}：备份完成，版本：${gitTags}`;
                                        outPut.done = true;
                                        num ++;
                                        setTimeout(() => {
                                            Socket.emit(socketEvent,outPut);
                                            resolve({
                                                status: true,
                                                deployStatus:500,
                                                msg: `项目初次备份完成；git：${sshUrl}`,
                                                gitBackSshUrl: sshUrl,
                                                data:{
                                                    gitBackSshUrl: sshUrl,
                                                    projectId: projectInfo.projectId,
                                                    gitTags: projectInfo.gitTags,
                                                    projectBackId: backProject.id,
                                                    projectName: projectInfo.projectName,
                                                    remark: `项目初次备份完成；git：${sshUrl}`
                                                }
                                            });
                                        }, num * 100)
                                    } else {
                                        resolve({
                                            status: true,
                                            deployStatus:500,
                                            msg: `项目初次备份完成；git：${sshUrl}`,
                                            gitBackSshUrl: sshUrl,
                                            data:{
                                                gitBackSshUrl: sshUrl,
                                                projectId: projectInfo.projectId,
                                                gitTags: projectInfo.gitTags,
                                                projectBackId: backProject.id,
                                                projectName: projectInfo.projectName,
                                                remark: `项目初次备份完成；git：${sshUrl}`
                                            }
                                        });
                                    }
                                    console.log('备份完成', projectInfo.gitTags);
                                }).checkout('master')
                        }
                    }).catch((err) => {
                        console.log(`=========>>创建失败：${err.toString()}`);
                        if(socketEvent) {
                            outPut.msg = `${projectName}：备份失败，版本：${gitTags}；${err.toString()}`;
                            outPut.done = true;
                            num ++;
                            setTimeout(() => {
                                Socket.emit(socketEvent,outPut);
                                reject({
                                    status: false,
                                    deployStatus: 501,
                                    msg: `创建 ${projectInfo.projectName} 备份项目失败；失败原因:${err.toString()}`,
                                    error: `创建 ${projectInfo.projectName} 备份项目失败；失败原因:${err.toString()}`
                                });
                            }, num * 100)
                        } else {
                            reject({
                                status: false,
                                deployStatus: 501,
                                msg: `创建 ${projectInfo.projectName} 备份项目失败；失败原因:${err.toString()}`,
                                error: `创建 ${projectInfo.projectName} 备份项目失败；失败原因:${err.toString()}`
                            });
                        }

                    });
                }
            });
            return result;
        }
        /*
        * 保存项目备份日志
        * */
        * saveProjectBackLog(projectBackInfo) {
            let webhookBackField = ['gitTags', 'projectId', 'projectName', 'gitBackSshUrl', 'projectBackId', 'remark'];
            let allFields = projectBackInfo;
            let fields = {
                updateTime: new Date()
            };
            webhookBackField.map((val) => {
                if(allFields[val]) {
                    fields[val] = allFields[val];
                }
            });
            if(allFields['backId']) {
                yield this.knex(this.tableWebhookBackName).update(fields).where({
                    backId: allFields['backId']
                })
            } else {
                fields['createTime'] = new Date();
                yield this.knex(this.tableWebhookBackName).insert(fields);
            }
        }
    }
    return BaseService;
};
