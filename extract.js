#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { extractInfo } = require('./helpers/mp4reader');


async function processAll(filenames) {
    for (let i = 0; i < filenames.length; i++) {
        const filename = filenames[i];
        const dir = path.dirname(filename);
        const ext = path.extname(filename);
        const basename = path.basename(filename, ext);
        const output = path.join(dir, basename + '.json');

	if (!fs.existsSync(output)) {
	    await extractInfo(filename, output);
	} else {
	    console.log(`Skipping ${basename} as telemetry file already exists: ${output}`)
	}
    }
}

const filenames = process.argv.slice(2);
processAll(filenames)
    .then(() => console.log("Done"))
    .catch(err => console.error("An error occurred", err));






