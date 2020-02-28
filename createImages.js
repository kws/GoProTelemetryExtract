#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const colors = require('colors');
const ffmpeg = require('fluent-ffmpeg');

const TelemetryData = require('./helpers/telemetryData');

const AltTrace = require('./helpers/altTrace');
const GForceBar = require('./helpers/gforceBar');
const GpsTrace = require('./helpers/gpsTrace');
const SpeedBar = require('./helpers/speedBar');

program
    .version('0.0.1')
    .option('-v, --video', 'video input file')
    .option('-t, --telemetry', 'telemetry file')
    .option('-i, --imagedir <dir>', 'image (root) directory', './images/')
    .option('-r, --framerate <rate>', 'framerate', 25)
    .option('--no-delete', 'delete image directory')
    .arguments('<filename>');
program.parse(process.argv);

if (program.args.length !== 1) {
    program.help(text => `${colors.red('Please provide a single filename as input.')}\n\n${text}`);
}

const fileArg = program.args[0];
const dir = path.dirname(fileArg);
const baseExt = path.extname(fileArg);
const basename = path.basename(fileArg, baseExt);
const mp4Ext = baseExt.toLowerCase() === '.mp4' ? baseExt : '.MP4';
const telemetryExt = '.json';

const videoFile = program.video ? program.video : path.join(dir, `${basename}${baseExt}`);
const telemetryFile = program.telemetry ? program.telemetry : path.join(dir, `${basename}${telemetryExt}`);
const compositeFile = program.video ? program.video : path.join(dir, `${basename}-telemetry${baseExt}`);

const outputPath = path.join(program.imagedir, basename);

if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
}

if (program.delete) {
    const images = fs.readdirSync(outputPath);
    images.forEach(image => {
        fs.unlinkSync(path.join(outputPath, image))
    });
}

const telemetryData = new TelemetryData(telemetryFile);

const gpsSamples = telemetryData.getGPS();
const accelSamples = telemetryData.getAccel();

const canvas = createCanvas(1920, 1440);
const ctx = canvas.getContext('2d');
const gpsTrace = new GpsTrace(gpsSamples, {'x': 50, 'y': 100});
const altTrace = new AltTrace(gpsSamples, {'x': 1450, 'y': 100});
const speedBar = new SpeedBar(gpsSamples, {'x': 50, 'y': 50});
const gForceBar = new GForceBar(accelSamples, {'x': 1450, 'y': 1300});

const imageRate = program.framerate;
const maxFrame = telemetryData.getMaxFrame(imageRate);
console.log('MAX FRAME', maxFrame);

for (let frame = 0; frame < maxFrame; frame += 1) {
    const ts = frame / imageRate;
    console.log(frame, ts);

    ctx.clearRect(0,0,canvas.width, canvas.height);

    const gps = telemetryData.findNearest(gpsSamples, ts);

    altTrace.drawTrace(ctx);
    altTrace.drawLocation(ctx, gps);

    speedBar.drawBox(ctx, gps);

    gpsTrace.drawTrace(ctx);
    gpsTrace.drawLocation(ctx, gps);

    const accel = telemetryData.findNearest(accelSamples, ts);

    gForceBar.drawBox(ctx, accel);
    gForceBar.drawCircle(ctx, accel);

    const buffer = canvas.toBuffer();
    const frameDimensions = Math.ceil(Math.log10(maxFrame));
    for (let x = 0 ; x<1; x++) {
        fs.writeFileSync(`${outputPath}/frame-${String(frame+x).padStart(frameDimensions,'0')}.png`, buffer);
    }

}

const command = ffmpeg(videoFile)
    .audioCodec('copy')
    .input(`${outputPath}/frame-*.png`)
    .inputOptions('-pattern_type glob')
    .withInputFps(imageRate)
    .complexFilter([
        {
            filter: 'colorchannelmixer', options: 'aa=1.0',
            inputs: ['1:v'], outputs: 'ovr'
        },
        {
            filter: 'overlay',
            inputs: ['0:v','ovr'], outputs: 'v'
        },
    ], ['v'])
    .on('progress', function(progress) {
        console.log('Processing: ',progress);
    })
    .on('error', function(err) {
        console.log('An error occurred: ' + err.message);
    })
    .on('end', function() {
        console.log('Processing finished !');
    });

// Horrible hack since map automatically adds brackets
command._complexFilters('-map', '0:a');

command.save(compositeFile);

