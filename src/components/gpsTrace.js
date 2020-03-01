function _moduleHack(obj) {
    return obj.__esModule ? obj.default : obj;
}
const proj4 = _moduleHack(require('proj4'));
const palette = require('google-palette');

const source = proj4.Proj('EPSG:4326');
const dest = proj4.Proj('EPSG:3785');

class GpsTrace {
    constructor(samples, options) {
        this.samples = samples;

        options = options || {};
        options.x = options.x || 0;
        options.y = options.y || 0;
        options.size = options.size | 300;
        options.traceWidth = options.traceWidth || 3;
        options.palette = options.palette || 'cb-RdYlGn';

        options.locationSize = options.locationSize || 7;
        options.locationColor = options.locationColor || '#fff';
        options.locationBorderColor = options.locationBorderColor || '#000';

        this.options = options;

        this.clrs = palette(options.palette, 10);


        samples.forEach((sample, ix) => {
            const value = sample.value;
            if (value[0] && value[1]) {
                const p = proj4.toPoint([value[1], value[0]]);
                const outputCoords = proj4.transform(source, dest, p);
                sample.mercator = outputCoords;
                if (ix === 0 || !samples[ix-1].refPoint) {
                    sample.dist = 0;
                    sample.totalDist = 0;
                    sample.refDist=0;
                    sample.refPoint=sample.mercator;
                } else {
                    const distX = sample.mercator.x - samples[ix-1].refPoint.x;
                    const distY = sample.mercator.y - samples[ix-1].refPoint.y;
                    sample.refDist = Math.sqrt(distX**2 + distY**2);
                    if (sample.refDist >= 10) {
                        sample.totalDist = sample.refDist + samples[ix-1].totalDist;
                        sample.refPoint=sample.mercator;
                        sample.refDist=0;
                    } else {
                        sample.refPoint=samples[ix-1].refPoint;
                        sample.totalDist = samples[ix-1].totalDist;
                    }
                    sample.dist = sample.totalDist + sample.refDist;
                }
            }
        });

        const gpsScale = {
            'xMin': Math.min(...samples.map(sample => sample.mercator ? sample.mercator.x : 0)),
            'xMax': Math.max(...samples.map(sample => sample.mercator ? sample.mercator.x : 0)),
            'yMin': Math.min(...samples.map(sample => sample.mercator ? sample.mercator.y : 0)),
            'yMax': Math.max(...samples.map(sample => sample.mercator ? sample.mercator.y : 0)),
            'totalDist': Math.max(...samples.map(sample => sample.dist ? sample.dist : 0)),
        };
        gpsScale.xScale = (gpsScale.xMax - gpsScale.xMin) / options.size;
        gpsScale.yScale = (gpsScale.yMax - gpsScale.yMin) / options.size;
        gpsScale.scale = Math.max(gpsScale.xScale, gpsScale.yScale);
        gpsScale.xPad = (options.size - (gpsScale.xMax - gpsScale.xMin) / gpsScale.scale) / 2;
        gpsScale.yPad = (options.size - (gpsScale.yMax - gpsScale.yMin) / gpsScale.scale) / 2;

        this.gpsScale = gpsScale;
    }

    drawTrace(ctx) {
        // ctx.fillStyle = 'rgba(0,0,0,.2)';
        // ctx.fillRect(this.options.x, this.options.y, this.options.size, this.options.size);
        this.samples.forEach((sample, ix) => {
            if (!sample.mercator) {
                return;
            }
            const {x,y} = this.getLocation(sample);
            const cIndex = Math.max(9-Math.floor(sample.speed3d_kph/5), 0);
            const color = this.clrs[cIndex];
            ctx.fillStyle = `#${color}`;
            ctx.fillRect(x-1,y-1,3,3);
        });
    }

    drawLocation(ctx, sample) {
        if (!sample || !sample.mercator) {
            return;
        }
        const {x,y} = this.getLocation(sample);
        ctx.beginPath();
        ctx.arc(x, y, this.options.locationSize,0,2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = this.options.locationColor;
        ctx.fill();
        ctx.fillStyle = this.options.locationBorderColor;
        ctx.stroke();
    }

    getLocation(sample) {
        const y =  this.options.size + this.options.y - this.gpsScale.yPad -
            (sample.mercator.y - this.gpsScale.yMin) / this.gpsScale.scale;
        const x = this.gpsScale.xPad + this.options.x + (sample.mercator.x - this.gpsScale.xMin) / this.gpsScale.scale;
        return {x, y};
    }

}

module.exports = GpsTrace;


