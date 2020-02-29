const { createCanvas } = require('canvas');
const { Readable } = require('stream');

const AltTrace = require('./altTrace');
const GForceBar = require('./gforceBar');
const GpsTrace = require('./gpsTrace');
const SpeedBar = require('./speedBar');

class Renderer {

    constructor(telemetryData, imageRate, maxFrames) {
        this.telemetryData = telemetryData;
        this.imageRate = imageRate;

        this.gpsSamples = telemetryData.getGPS();
        this.accelSamples = telemetryData.getAccel();

        this.canvas = createCanvas(1920, 1440);
        this.ctx = this.canvas.getContext('2d');
        this.gpsTrace = new GpsTrace(this.gpsSamples, {'x': 50, 'y': 100});
        this.altTrace = new AltTrace(this.gpsSamples, {'x': 1450, 'y': 100});
        this.speedBar = new SpeedBar(this.gpsSamples, {'x': 50, 'y': 50});
        this.gForceBar = new GForceBar(this.accelSamples, {'x': 1450, 'y': 1300});

        this.maxFrame = maxFrames ? maxFrames : telemetryData.getMaxFrame(imageRate);
        console.log('MAX FRAME', this.maxFrame);
    }

    renderFrame = (frame) => {
        const ctx = this.ctx;
        const ts = frame / this.imageRate;
        console.log(frame, ts);

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const gps = this.telemetryData.findNearest(this.gpsSamples, ts);

        this.altTrace.drawTrace(ctx);
        this.altTrace.drawLocation(ctx, gps);

        this.speedBar.drawBox(ctx, gps);

        this.gpsTrace.drawTrace(ctx);
        this.gpsTrace.drawLocation(ctx, gps);

        const accel = this.telemetryData.findNearest(this.accelSamples, ts);

        this.gForceBar.drawBox(ctx, accel);
        this.gForceBar.drawCircle(ctx, accel);

        return this.canvas.toBuffer();
    }

    getStream = () => {
        return new RendererStream(this.maxFrame, this.renderFrame, {});
    }

    writeFrames = (outputPath) => {
        const frameDimensions = Math.ceil(Math.log10(this.maxFrame));
        for (let frame = 0; frame < this.maxFrame; frame += 1) {
            const buffer = this.renderFrame(frame);
            fs.writeFileSync(`${outputPath}/frame-${String(frame).padStart(frameDimensions, '0')}.png`, buffer);
        }
    }

}

class RendererStream extends Readable {
    constructor(maxFrame, renderFrame, opt) {
        super(opt);
        this.maxFrame = maxFrame;
        this.renderFrame = renderFrame;
        this._index = 0;
    }

    _read = () => {
        const i = this._index;
        if (i > this.maxFrame)
            this.push(null);
        else {
            const buffer = this.renderFrame(this._index);
            this.push(buffer);
        }
        this._index++;
    }
}

module.exports = Renderer;