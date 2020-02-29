#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const program = require('commander');
const colors = require('colors');
const ffmpeg = require('fluent-ffmpeg');

const TelemetryData = require('./helpers/telemetryData');
const Renderer = require('./helpers/renderer');

program
    .version('0.0.1')
    .option('-v, --video', 'video input file')
    .option('-t, --telemetry', 'telemetry file')
    .option('-i, --imagedir <dir>', 'image (root) directory', './images/')
    .option('-r, --framerate <rate>', 'framerate', 25)
    .option('-f, --frames <num>', 'number of frames to generate')
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

// if (program.delete) {
//     const images = fs.readdirSync(outputPath);
//     images.forEach(image => {
//         fs.unlinkSync(path.join(outputPath, image))
//     });
// }

const telemetryData = new TelemetryData(telemetryFile);
const renderer = new Renderer(telemetryData, program.framerate, program.frames);

const command = ffmpeg(videoFile)
    .audioCodec('copy')
    // .input(`${outputPath}/frame-*.png`)
    .input(renderer.getStream())
    // .inputOptions('-pattern_type glob')
    .withInputFps(program.framerate)
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
if (program.frames) {
    command.frames(program.frames)
}
command.save(compositeFile);

