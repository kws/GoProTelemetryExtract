const Rematrix = require('rematrix');
const math = require('mathjs');

function Point3D(x,y,z) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.transform = function(transforms) {
        const transform = transforms.reduce(Rematrix.multiply);
        let transformMatrix = [
            math.subset(transform, math.index(math.range(0,4))),
            math.subset(transform, math.index(math.range(4,8))),
            math.subset(transform, math.index(math.range(8,12))),
            math.subset(transform, math.index(math.range(12,16))),
        ];
        const transformed =  math.multiply([this.x, this.y, this.z, 1], transformMatrix);
        return new Point3D(transformed[0],transformed[1],transformed[2]);
    };

    this.rotate = function(x, y, z) {
        const transforms = [
            Rematrix.rotateX(x),
            Rematrix.rotateY(y),
            Rematrix.rotateZ(z),
        ];
        return this.transform(transforms);
    };

    this.project = function(viewWidth, viewHeight, fov, viewDistance) {
        const factor = fov / (viewDistance + this.z);
        const x = this.x * factor + viewWidth / 2;
        const y = this.y * factor + viewHeight / 2;
        return new Point3D(x, y, this.z)
    }
}

Point3D.prototype.toString = function pointToString() {
    return '' + this.name;
};

module.exports = {
    Point3D
};