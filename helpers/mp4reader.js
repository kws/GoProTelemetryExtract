const fs = require('fs');
const path = require('path');
const MP4Box = require('mp4box');
const goproTelemetry = require(`gopro-telemetry`);

/**
 * Streams any size file.
 * @param filename
 */
function streamData(filename) {
    return new Promise((resolve, reject) => {
        const mp4boxfile = MP4Box.createFile();
        mp4boxfile.onError = function(e) {
            reject(e);
        };
        mp4boxfile.onReady = function(videoData) {
            resolve({ videoData, mp4boxfile});
        };
        const stream = fs.createReadStream(filename, {'highWaterMark': 5*1024*1024});
        let bytesRead = 0;
        stream.on('data', (chunk) => {
            const arrayBuffer = new Uint8Array(chunk).buffer;
            arrayBuffer.fileStart = bytesRead;
            mp4boxfile.appendBuffer(arrayBuffer);
            bytesRead += chunk.length;
        });
    });
}

/**
 * Reads data directly. Only works on smaller files.
 * @param filename
 */
function readData(filename) {
    return new Promise((resolve, reject) => {
        const mp4boxfile = MP4Box.createFile();
        mp4boxfile.onError = function (e) {
            reject(e);
        };
        mp4boxfile.onReady = function (videoData) {
            resolve({ videoData, mp4boxfile});
        };

        const arrayBuffer = new Uint8Array(fs.readFileSync(filename)).buffer;
        arrayBuffer.fileStart = 0;

        mp4boxfile.appendBuffer(arrayBuffer);
    });
}


//Will convert the final uint8Array to buffer
//https://stackoverflow.com/a/12101012/3362074
function toBuffer(ab) {
    let buf = Buffer.alloc(ab.byteLength);
    let view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}

function extractVideoData(videoData, mp4boxfile) {
    return new Promise(function(resolve, reject) {

        let trackId;
        let nb_samples;
        const timing = {};

        for (let i = 0; i < videoData.tracks.length; i++) {
            //Find the metadata track. Collect Id and number of samples
            if (videoData.tracks[i].codec === 'gpmd') {
                trackId = videoData.tracks[i].id;
                nb_samples = videoData.tracks[i].nb_samples;
                timing.start = videoData.tracks[i].created;
            } else if (videoData.tracks[i].type === 'video') {
                const vid = videoData.tracks[i];
                //Deduce framerate from video track
                timing.frameDuration =
                    vid.movie_duration / vid.movie_timescale / vid.nb_samples;
            }
        }


        if (trackId != null) {


            //Request the track
            mp4boxfile.setExtractionOptions(trackId, null, {
                nbSamples: nb_samples
            });

            //When samples arrive
            mp4boxfile.onSamples = function (id, user, samples) {
                const totalSamples = samples.reduce(function (acc, cur) {
                    return acc + cur.size;
                }, 0);

                //Save the time and duration of each sample
                timing.samples = [];

                //Store them in Uint8Array
                const uintArr = new Uint8Array(totalSamples);
                let runningCount = 0;
                samples.forEach(function (sample) {
                    timing.samples.push({cts: sample.cts, duration: sample.duration});
                    for (let i = 0; i < sample.size; i++) {
                        uintArr.set(sample.data, runningCount);
                    }
                    runningCount += sample.size;
                });

                //Convert to Buffer
                const rawData = toBuffer(uintArr);

                //And return it
                resolve({rawData, timing});
            };

            mp4boxfile.start();
        } else {
            reject('Track not found');
        }
    });

}

async function extractInfo(input, output) {
    console.log(`Opening ${input}`);
    const {videoData, mp4boxfile} = await streamData(input);
    console.log(`Read stream data from ${path.basename(input)}`);
    const extracted = await extractVideoData(videoData, mp4boxfile);
    console.log(`Extracted information for ${path.basename(input)}`);
    const telemetry = await goproTelemetry(extracted, {'promisify': true});
    console.log(`Generated telemetry for ${path.basename(input)}`);
    fs.writeFileSync(output, JSON.stringify(telemetry));
    console.log(`Telemetry saved as JSON to ${path.basename(output)}`);
}

module.exports = {
    streamData,
    readData,
    extractVideoData,
    extractInfo,
};