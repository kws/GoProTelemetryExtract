const fs = require('fs');
const Renderer = require('./renderer');

class FileRenderer extends Renderer {
    renderAll(outputPath) {
        const frameDimensions = Math.ceil(Math.log10(this.maxFrame));
        for (let frame = 0; frame <= this.maxFrame; frame += 1) {
            const buffer = this.renderFrame(frame);
            fs.writeFileSync(`${outputPath}/frame-${String(frame).padStart(frameDimensions, '0')}.png`, buffer);
        }
    }
}

module.exports = FileRenderer;