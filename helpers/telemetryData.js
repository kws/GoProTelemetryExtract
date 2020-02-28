const fs = require('fs');

class TelemetryData {
    constructor(filename) {
        this.telemetry = JSON.parse(
            fs.readFileSync(filename).toLocaleString()
        );
        this.accelSamples = prepareAccel(this.telemetry['1']['streams']['ACCL']['samples']);
        this.gyroSamples = prepareGyro(this.telemetry['1']['streams']['GYRO']['samples']);
        this.gpsSamples = prepareGPS(this.telemetry['1']['streams']['GPS5']['samples']);
    }

    getFrameRate() {
        return this.telemetry['frames/second'];
    }

    getMaxFrame(framerate) {
        const cts = this.gyroSamples.map(sample => sample.cts ? sample.cts : 0)
        const maxGyro = cts.reduce((cum, cur) => Math.max(cum, cur), 0);
        return Math.ceil(framerate  * maxGyro / 1000);
    }

    getAccel() {
        return this.accelSamples;
    }

    getGyro() {
        return this.gyroSamples;
    }

    getGPS() {
        return this.gpsSamples;
    }

    findNearest(samples, timestamp) {
        let minDiff, bestSample;
        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            const cts = sample.cts / 1000;
            const diff = Math.abs(timestamp - cts);
            if (minDiff === undefined) {
                minDiff = diff;
                bestSample = sample;
            } else {
                if (diff > minDiff) {
                    return bestSample;
                } else {
                    minDiff = diff;
                    bestSample = sample;
                }
            }
        }
        return bestSample;
    }

}

function prepareGyro(gyroSamples) {
    gyroSamples.forEach((sample, ix) => {
        sample.index = ix;
        if (ix > 0) {
            copySticky(sample, gyroSamples[ix - 1]);
        }
        const value = sample.value;
        if (ix === 0) {
            sample.orientation = [0, 0, 0];
        } else {
            const delta_t = (sample.cts - gyroSamples[ix - 1].cts) / 1000;
            const prevOrientation = gyroSamples[ix - 1].orientation;
            sample.orientation = [
                prevOrientation[0] - (value[0] * delta_t),
                prevOrientation[1] - (value[1] * delta_t),
                prevOrientation[2] + (value[2] * delta_t),
            ];
        }
        sample.orientation_rad = sample.orientation.map(degrees => degrees * 180 / Math.PI);
    });
    return gyroSamples;
}

function prepareGPS(gpsSamples) {
    gpsSamples.forEach((sample, ix) => {
        sample.index = ix;
        if (ix > 0) {
            copySticky(sample, gpsSamples[ix - 1]);
        }
        const value = sample.value;
        sample.alt= value[2];
        sample.speed3d = value[4];
        sample.speed3d_kph = sample.speed3d * 3.6;
    });
    return gpsSamples.filter(sample => sample.sticky.precision < 1000);
}

function copySticky(current, previous) {
    if (!current.sticky) {
        current.sticky = {}
    }
    Object.keys(previous.sticky).forEach((key) => {
        if (!current.sticky[key]) {
            current.sticky[key] = previous.sticky[key];
        }
    });
}

function prepareAccel(accelSamples) {
    accelSamples.forEach((sample, ix) => {
        sample.index = ix;
        if (ix > 0) {
            copySticky(sample, accelSamples[ix - 1]);
        }

        const value = sample.value;
        sample.abs = Math.sqrt(value[0] ** 2 + value[1] ** 2 + value[2] ** 2);
        sample.vector = [
            Math.acos(value[0] / sample.abs),
            Math.acos(value[1] / sample.abs),
            Math.acos(value[2] / sample.abs),
        ];
    });
    return accelSamples;
}

module.exports = TelemetryData;