#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const program = require('commander');
const colors = require('colors');
const ffmpeg = require('fluent-ffmpeg');
const cliProgress = require('cli-progress');
const { createCanvas } = require('canvas');

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

const videoFile = program.video ? program.video : path.join(dir, `${basename}${mp4Ext}`);
const telemetryFile = program.telemetry ? program.telemetry : path.join(dir, `${basename}${telemetryExt}`);
const compositeFile = program.video ? program.video : path.join(dir, `${basename}-telemetry${mp4Ext}`);


ffmpeg.ffprobe(videoFile, function(err, metadata) {
    const video_streams = metadata.streams.filter(s => s.codec_type === 'video');
    // Just pick the first...?
    const video_metadata = video_streams[0];
    encode(video_metadata)
});

function encode(video_metadata) {
    const telemetryData = new TelemetryData(telemetryFile);

    const canvas = createCanvas(video_metadata.coded_width, video_metadata.coded_height);
    const renderer = new Renderer(canvas, telemetryData, program.framerate,
        program.frames ? program.frames : video_metadata.nb_frames);

    // create new container
    const multibar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: '{bar} {percentage}% | {name} | ETA: {eta}s | {value}/{total}',

    }, cliProgress.Presets.shades_grey);

    // add bars
    const imageBar = multibar.create(renderer.maxFrame, 0, {name: "Images"});
    const videoBar = multibar.create(video_metadata.nb_frames, 0,  {name: "Video"});

    renderer.on('frame', frame => {
        imageBar.update(frame);
    });


    const command = ffmpeg(videoFile)
        .audioCodec('copy')
        .input(renderer.getStream())
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
            videoBar.update(progress.frames)
        })
        .on('error', function(err) {
            console.log('\nAn error occurred: ' + err.message);
            process.exit(-1);
        })
        .on('end', function() {
            console.log('\nProcessing finished !');
            process.exit(0);
        });

    // Horrible hack since map automatically adds brackets
    command._complexFilters('-map', '0:a');
    if (program.frames) {
        command.frames(program.frames)
    }
    command.save(compositeFile);

}
