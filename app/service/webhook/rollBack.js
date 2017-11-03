const SimmpleGit = require('simple-git');
const path = require('path');

module.exports = app => {
  class RollBackService extends app.Service {
      constructor(props) {
          super(props);
      }
      checkout (gitTags, projectName, projectBackPath) {
           let result = new Promise((resolve, reject) => {
               let Git = SimmpleGit(projectBackPath);
               /*
               * 环节一 开始切换分支
               * */
               console.log('=========>>开始切换分支');
               Git.checkout(gitTags, function(err) {
                   if(err) {
                       console.log('=========>> 切换分支失败');
                       console.log(err);
                       reject({
                          status: false,
                          msg: `${projectName}切换分支${gitTags}失败：${String(err)}`,
                          error: err,
                           Git,
                           deployStatus: 603
                       });
                       return;
                   }
                   console.log('=========>>切换完成');
                   resolve({
                       status: true,
                       msg: `${projectName}切换分支${gitTags}成功`,
                       Git
                   })
               });
           });
           return result;
      }
      cloneProject (projectDockerBackPath, projectBackPath,projectName, gitBackSshUrl) {
          shell.cd('/'+parsePath(projectDockerBackPath));
          shell.mkdir(projectName);
          let result = new Promise((resolve, reject) => {
              let Git = SimmpleGit(projectBackPath);
              Git.clone(gitBackSshUrl, projectBackPath, (err) => {
                  if(err){
                      reject({
                          status: false,
                          msg: `${projectName}项目回滚，git clone 失败 ${String(err)}`,
                          deployStatus: 602
                      });
                      return;
                  }
                  resolve({
                      status: true,
                      msg: `${projectName}项目回滚，git colne 完成`
                  })
              })
          });
          return result;
      }
      rollBackProject(data,projectBackPath, SSH) {
          let {projectName, saveProjectPath} = data;
           let result = new Promise((resolve, reject) => {
               console.log('=========>>部署开始');
               console.log(`=========>>上传项目webhook本地地址： ${projectBackPath}`);
               console.log(`=========>>上传项目远程服务地址路径： ${saveProjectPath}`);
               let failFile = [];
               let successFile = [];
               SSH.putDirectory(projectBackPath,saveProjectPath,{
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
                   console.log('=========>>文件部署失败', failFile.join(' ||=|| '));
                   console.log('=========>>文件部署成功', successFile.join(' ||=|| '));
                   if(failFile.length){
                       SSH.putFiles(failFile).then(() => {
                           console.log('=========>>目标文件重新部署完成');
                           resolve({
                               deployStatus: 600,
                               msg: ` ${projectName} 部署成功`,
                               status: true,
                               failFile: "No fail file",
                               successFile: successFile.concat(failFile).join(',')
                           })
                       },(error) => {
                           reject({
                               deployStatus: 601,
                               msg: ` ${projectName}  部署失败：${error.toString()}`,
                               status: false,
                               failFile: error.toString(),
                               successFile: successFile.join(',')
                           })
                       })
                   } else {
                       resolve({
                           deployStatus: 600,
                           msg:  ` ${projectName} 部署成功`,
                           status: true,
                           failFile: failFile.join(','),
                           successFile: successFile.join(',')
                       })
                   }
               }).catch((err) => {
                   console.log('=========>>服务器部署 失败 ', err.toString());
                   reject({
                       deployStatus: 601,
                       status: false,
                       error: err.toString(),
                       msg: `${projectName} 部署失败 ${err.toString()}`
                   })
               })
           });
           return result;
      }

  }
  return RollBackService;
};
