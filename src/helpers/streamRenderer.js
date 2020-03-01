const { Readable } = require('stream');
const Renderer = require('./renderer');

class StreamRenderer extends Renderer {
    getStream(canvas) {
        return new RendererStream(this, canvas, this.maxFrame, this.renderFrame, {});
    }
}


class RendererStream extends Readable {
    constructor(renderer, canvas, maxFrame, renderFrame, opt) {
        super(opt);
        this.renderer = renderer;
        this.canvas = canvas;
        this.maxFrame = maxFrame;
        this.renderFrame = renderFrame;
        this._index = 0
    }

    frameToBuffer(frame) {
        this.renderer.render(this.canvas, frame);
        return this.canvas.toBuffer();
    }

    _read() {
        const i = this._index;
        if (i > this.maxFrame)
            this.push(null);
        else {
            const buffer = this.frameToBuffer(this._index);
            this.push(buffer);
        }
        this._index++;
    }
}

module.exports = StreamRenderer;