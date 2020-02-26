#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { box } = require('./helpers/box');

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
    if (ix < 25 && Math.abs(9.8 - sample['abs']) <= 0.5) {
        console.log(sample['index'], sample['abs'], sample['vector']);
    }
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
        console.log(sample['orientation']);
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

const gpsSamples = telemetry['1']['streams']['GPS5']['samples'];
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
const skip = 5;
for (let frame = 0; frame<maxFrame; frame += skip) {
    const ts = frame / framerate;

    const gyro = findNearest(gyroSamples, ts);
    const orientation = gyro['orientation'];

    const accel = findNearest(accelSamples, ts);
    const accelValue = accel['value'];
    const accelVector = accel['vector'];

    const gps = findNearest(gpsSamples, ts);

    console.log(frame, ts);

    ctx.clearRect(0,0,canvas.width, canvas.height);

    box(ctx, ...gyro['orientation_rad']);

    ctx.font = "50px Georgia";
    ctx.fillText(`Speed: ${gps['speed3d_kph'].toFixed(2)} km/h`, 100, 100);
    ctx.fillText(`Alt: ${gps['alt'].toFixed(2)} m`, 100, 150);

    try {
        ctx.fillText(`Temp: ${gyro['sticky']['temperature [°C]'].toFixed(1)} °C`, 1200, 100);
    } catch (e) {}
    try {
        ctx.fillText(`Fix: ${gps['sticky']['fix'].toFixed(2)}`, 1200, 150);
    } catch (e) {}
    try {
        ctx.fillText(`Precision: ${gps['sticky']['precision'].toFixed(2)}`, 1200, 200);
    } catch (e) {}

    ctx.fillText(`F: ${frame}`, 100, 1250);
    ctx.fillText(`X: ${(orientation[0]).toFixed(2)}`, 100, 1300);
    ctx.fillText(`Y: ${(orientation[1]).toFixed(2)}`, 100, 1350);
    ctx.fillText(`Z: ${(orientation[2]).toFixed(2)}`, 100, 1400);

    ctx.fillText(`ABS: ${accel['abs'].toFixed(2)}`, 1200, 1250);
    ctx.fillText(`${accelValue[0] >= 0 ? 'down' : 'up'}: ${(accelVector[0] * 180 / Math.PI).toFixed(2)} ` +
        `/ ${Math.abs(accelValue[0]).toFixed(2)}`, 1200, 1300);
    ctx.fillText(`${accelValue[1] >= 0 ? 'right' : 'left'}: ${(accelVector[1] * 180 / Math.PI).toFixed(2)} ` +
        `/ ${Math.abs(accelValue[1]).toFixed(2)}`, 1200, 1350);
    ctx.fillText(`${accelValue[2] >= 0 ? 'forward' : 'back'}: ${(accelVector[2] * 180 / Math.PI).toFixed(2)} ` +
        `/ ${Math.abs(accelValue[2]).toFixed(2)}`, 1200, 1400);

    const buffer = canvas.toBuffer();
    for (let x = 0 ; x<1; x++) {
        fs.writeFileSync(`${__dirname}/images/test-${String(frame+x).padStart(4,'0')}.png`, buffer);
    }

}