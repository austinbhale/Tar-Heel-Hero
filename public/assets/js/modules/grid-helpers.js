var ogXScale;

module.exports = {
    drawLines: function (THREE, start, end, color) {
        // Draw moving lines.
        var material = new THREE.LineBasicMaterial({
            color: color,
            transparent: false
        });

        var geometry = new THREE.Geometry();

        var line_from = new THREE.Vector3(start.x, start.y, start.z);
        var line_to = new THREE.Vector3(end.x, end.y, end.z);

        geometry.vertices.push(line_from);
        geometry.vertices.push(line_to);

        var line = new THREE.Line(geometry, material);

        line.position.set(0, 0, 0);
        return line;
    },
    // credit: https://stackoverflow.com/questions/1787124/programmatically-darken-a-hex-colour
    darkenHex: function (hex, changeBy) {
        // Changes to a ceiling if lighten is active.
        let floor = 0x0;
        return (Math.max((hex >> 16) - changeBy, floor) << 16) +
            (Math.max(((hex & 0xff00) >> 8) - changeBy, floor) << 8) +
            Math.max(((hex & 0xff) - changeBy), floor);
    },
    setOriginalXScale: function(value) {
        ogXScale = value;
    },
    getOriginalXScale: function() {
        return ogXScale;
    }
}