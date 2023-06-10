
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
