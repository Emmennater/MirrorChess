
let animationQueue = [];

// Animation details:
// - duration (seconds)
// - lerp function
// - callback on finish
class CustomAnimation {
    constructor(duration, lerpFun, onComplete) {
        this.duration = duration;
        this.lerpFun = lerpFun;
        this.onComplete = onComplete;
        this.time = duration;
        animationQueue.push(this);
    }

    update(deltaTime) {
        // Subtact a 60th of a second from the time remaining
        this.time -= deltaTime;

        this.lerpFun(1 - this.time / this.duration);

        // Animation complete
        if (this.time <= 0) {
            this.onComplete();
            return true;
        }

        return false;
    }

    static updateAnimations(deltaTime) {
        for (let i = 0; i < animationQueue.length; i++) {
            let animation = animationQueue[i];
            let done = animation.update(deltaTime);
            if (done) {
                animationQueue.splice(i--, 1);
            }
        }
    }
}
