'use strict';
const { app, assert } = require('egg-mock/bootstrap');
describe('用户管理', () => {
    describe('/api/user/findAll 获取所有用户',() => {
        it('参数为空',(done) => {
             app.httpRequest()
                .get('/api/user/findAll')
                .expect((xhr) => {
                    // if (xhr.body.data.length > 0) {
                    //     return (xhr.body.status  !== "S")
                    // } else {
                    //     return (xhr.body.status  === "F")
                    // }

                })
                .expect(200)
                .end(done);
        });
    });
    describe('/api/user/findById 查询用户权限配置', () => {
        it('参数为空',(done) => {
            app.httpRequest()
                .get('/api/user/findById')
                .expect((xhr) => {
                    return (xhr.body.status === "F" && xhr.body.msg === '该用户尚未激活');
                })
                .expect(200)
                .end(done);
        })
    })
});
