#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const AltTrace = require('./helpers/altTrace');
const GForceBar = require('./helpers/gforceBar');
const GpsTrace = require('./helpers/gpsTrace');
const SpeedBar = require('./helpers/speedBar');


const filename = process.argv[2];

const telemetry = JSON.parse(
    fs.readFileSync(filename).toLocaleString()
);

const outputPath = "./images/"

const images = fs.readdirSync(outputPath);
images.forEach(image => {
    fs.unlinkSync(path.join(outputPath, image))
});

function copySticky(current, previous) {
    if (!current['sticky']) {
        current['sticky'] = {}
    }
    Object.keys(previous['sticky']).forEach((key) => {
        if (!current['sticky'][key]) {
            current['sticky'][key] = previous['sticky'][key];
        }
    });
}

const accelSamples = telemetry['1']['streams']['ACCL']['samples'];
accelSamples.forEach((sample, ix) => {
    sample['index'] = ix;
    if (ix > 0) {
        copySticky(sample, accelSamples[ix-1]);
    }

    const value = sample['value'];
    sample['abs'] = Math.sqrt(value[0]**2 + value[1]**2 + value[2]**2);
    sample['vector'] = [
        Math.acos(value[0] / sample['abs']),
        Math.acos(value[1] / sample['abs']),
        Math.acos(value[2] / sample['abs']),
    ];
    // if (ix < 25 && Math.abs(9.8 - sample['abs']) <= 0.5) {
    //     console.log(sample['index'], sample['abs'], sample['vector']);
    // }
});

const gyroSamples = telemetry['1']['streams']['GYRO']['samples'];
gyroSamples.forEach((sample, ix) => {
    sample['index'] = ix;
    if (ix > 0) {
        copySticky(sample, gyroSamples[ix-1]);
    }

    const value = sample['value'];
    if (ix === 0) {
        const vector = accelSamples[0]['vector'];
        // sample['orientation'] = [vector[0], vector[1], vector[2]];
        sample['orientation'] = [0,0,0];
    } else {
        const delta_t = (sample['cts'] - gyroSamples[ix-1]['cts']) / 1000;
        const prevOrientation = gyroSamples[ix-1]['orientation'];
        sample['orientation'] = [
            prevOrientation[0] - (value[0] * delta_t),
            prevOrientation[1] - (value[1] * delta_t),
            prevOrientation[2] + (value[2] * delta_t),
        ];
    }
    sample['orientation_rad'] = sample['orientation'].map(degrees => degrees * 180 / Math.PI);
});

let gpsSamples = telemetry['1']['streams']['GPS5']['samples'];
gpsSamples.forEach((sample, ix) => {
    sample['index'] = ix;
    if (ix > 0) {
        copySticky(sample, gpsSamples[ix-1]);
    }
    const value = sample['value'];
    sample['alt'] = value[2];
    sample['speed3d'] = value[4];
    sample['speed3d_kph'] = sample['speed3d'] * 3.6

});
gpsSamples = gpsSamples.filter(sample => sample.sticky.precision < 1000);



const framerate =  telemetry['frames/second'];

function findNearest(samples, timestamp) {
    let minDiff, bestSample;
    for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];
        const cts = sample['cts'] / 1000;
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

const maxGyro = gyroSamples.reduce((agg, cur) => Math.max(agg, cur['cts']), 0);
const maxFrame = Math.ceil(framerate * maxGyro / 1000);

console.log('MAX FRAME', maxFrame);



const canvas = createCanvas(1920, 1440);
const ctx = canvas.getContext('2d');
const skip = 1;
const gpsTrace = new GpsTrace(gpsSamples, {'x': 50, 'y': 100});
const altTrace = new AltTrace(gpsSamples, {'x': 1450, 'y': 100});
const speedBar = new SpeedBar(gpsSamples, {'x': 50, 'y': 50});
const gForceBar = new GForceBar(accelSamples, {'x': 1450, 'y': 1300});

for (let frame = 0; frame<maxFrame; frame += skip) {
    const ts = frame / framerate;
    console.log(frame, ts);

    ctx.clearRect(0,0,canvas.width, canvas.height);

    const gps = findNearest(gpsSamples, ts);

    altTrace.drawTrace(ctx);
    altTrace.drawLocation(ctx, gps);

    speedBar.drawBox(ctx, gps);

    gpsTrace.drawTrace(ctx);
    gpsTrace.drawLocation(ctx, gps);

    const accel = findNearest(accelSamples, ts);

    gForceBar.drawBox(ctx, accel);
    gForceBar.drawCircle(ctx, accel);

    const buffer = canvas.toBuffer();
    for (let x = 0 ; x<1; x++) {
        fs.writeFileSync(`${__dirname}/images/test-${String(frame+x).padStart(4,'0')}.png`, buffer);
    }

}