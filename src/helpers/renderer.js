const EventEmitter = require('events');

const AltTrace = require('../components/altTrace');
const GForceBar = require('../components/gforceBar');
const GpsTrace = require('../components/gpsTrace');
const SpeedBar = require('../components/speedBar');

class Renderer extends EventEmitter {

    constructor(telemetryData, imageRate, maxFrames) {
        super();

        this.telemetryData = telemetryData;
        this.imageRate = imageRate;

        this.gpsSamples = telemetryData.getGPS();
        this.accelSamples = telemetryData.getAccel();

        this.gpsTrace = new GpsTrace(this.gpsSamples, {'x': 50, 'y': 100});
        this.altTrace = new AltTrace(this.gpsSamples, {'x': 1450, 'y': 100});
        this.speedBar = new SpeedBar(this.gpsSamples, {'x': 50, 'y': 50});
        this.gForceBar = new GForceBar(this.accelSamples, {'x': 1450, 'y': 1300});

        this.maxFrame = maxFrames ? maxFrames : telemetryData.getMaxFrame(imageRate);
        this.emit('max_frames', this.maxFrame);

    }
    render(canvas, frame) {
        this.emit('start_frame', frame, this.maxFrame);
        const ctx = canvas.getContext('2d');
        const ts = frame / this.imageRate;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const gps = this.telemetryData.findNearest(this.gpsSamples, ts);

        this.altTrace.drawTrace(ctx);
        this.altTrace.drawLocation(ctx, gps);

        this.speedBar.drawBox(ctx, gps);

        this.gpsTrace.drawTrace(ctx);
        this.gpsTrace.drawLocation(ctx, gps);

        const accel = this.telemetryData.findNearest(this.accelSamples, ts);

        this.gForceBar.drawBox(ctx, accel);
        this.gForceBar.drawCircle(ctx, accel);

        this.emit('frame', frame, this.maxFrame);
    }



}


module.exports = Renderer;