module.exports = app => {
    class GroupController extends app.Controller {
        constructor(props) {
            super(props);
        }
        * index(ctx) {
            const message = ctx.args[0];
            const Socket = this.ctx.socket;
            console.log(message);
            let socketId = Socket.id;
            Socket.emit('deploy', `服务器说：去你的 ${message} 我发送的事件是deploy ${socketId}`);
            Socket.emit('cat', `服务器说：去你的 ${message} 我发送的事件是deploy ${socketId} cat`);
            setInterval(function(){
                console.log('开始说话');
                Socket.emit('deploy', `服务器说：哈哈 ${socketId}`)
            }, 3000)
        }
    }
    return GroupController;
};
