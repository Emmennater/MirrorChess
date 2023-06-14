
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function print(...args) {
    if (args.length !== 0) {
        console.log(...args);
    } else {
        window.print();
    }
}

function lerp(a, b, v) {
    return a * (1 - v) + b * v;
}

Array.prototype.back = function() {
    return this[this.length - 1];
}

function isMobileDevice() {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(navigator.userAgent);
}
  
