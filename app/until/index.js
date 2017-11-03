const parsePath = function(){
    let arr = [];
    for(let k in arguments) {
        let val = String(arguments[k]).replace(/(\/|\\)/g, ' ').trim().split(' ');
        arr = arr.concat(val);
    }
    return arr.join('/');
};
function padLeftZero(str) {
    return ('00' + str).substr(str.length);
}
const formatDate = function(date, fmt) {
    if (/(Y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    let o = {
        'M+': date.getMonth() + 1,
        'D+': date.getDate(),
        'h+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds()
    };
    for (let k in o) {
        if (new RegExp(`(${k})`).test(fmt)) {
            let str = o[k] + '';
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? str : padLeftZero(str));
        }
    }
    return fmt;
};

module.exports = {
    parsePath,
    formatDate
};