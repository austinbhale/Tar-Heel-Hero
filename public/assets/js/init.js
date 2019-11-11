var $ = require("jquery");
var THREE = require('three');
var helpers = require('./modules/grid-helpers');
var notesData = require('./modules/music-data');
var play = require('./modules/play-sound');
var game = require('./modules/gameplay');

const pitches = play.pitches();

var scene, camera, renderer, numOfCols; // good
const isDown = {} // good

var start, end, movingLines, setActiveIdx;
var notes, notesMovement;
var originalMeshPositions;
var lineVecs, linePos;
var circles, originalColors;
var objOffsetY = 0.1;

var skipLines = 1;
var totalNoteLine = 0; // each individual line
var currNoteLine = 0; // going through the json
var oneNote = true;
var activePitches = [];

var totalDuration, release;

////// Read JSON
var notesPerLine;
notesData.getMusicJSON($, function (data) {
    notesPerLine = data;
    init();
});

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // Load background texture with image.
    var planeGeom = new THREE.PlaneGeometry(55, 55);
    var imgSrc = "public/assets/images/concert.jpeg"
    var texture = new THREE.TextureLoader().load(imgSrc, (texture) => {
        texture.needsUpdate = true;
        mesh.scale.set(1.0, texture.image.height / texture.image.width, 1.0);
    });

    var material = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        map: texture
    });
    var mesh = new THREE.Mesh(planeGeom, material);
    mesh.position.z = -9;
    scene.add(mesh);

    var light = new THREE.PointLight(0xffffff, 1);
    light.position.set(0, 0, 30);
    scene.add(light);

    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;

        camera.updateProjectionMatrix();
    });

    var instructions = document.getElementById("instructions");
    instructions.addEventListener('click', () => {
        var instructionsCtr = document.getElementById('instructions-ctr');
        instructionsCtr.classList.contains('hide') ? instructionsCtr.classList.remove('hide') : instructionsCtr.classList.add('hide');
    });

    numOfCols = 4;

    var diffList = document.getElementById('difficulty-list');
    var target = document.getElementById('default-diff');
    diffList.addEventListener('click', (event) => {
        target.children[0].style.visibility = "hidden";

        target = event.target.closest('li');
        target.children[0].style.visibility = "visible";

        const index = [...target.parentElement.children].indexOf(target)
        numOfCols = index + 1;
    });

    var menu = document.getElementById("main-menu");

    var playBtn = document.getElementById('play-btn');
    playBtn.addEventListener('click', () => {
        menu.style.display = "none";
        initializeGrid();
    });

    // remove during production
    initializeGrid();
}

function initializeGrid() {

    // Adjust default camera position for more columns.
    if (numOfCols > 3) {
        camera.position.z += numOfCols > 5 ? 2 : 1;
    }

    // Draw Notes Grid.
    var material = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });

    lineVecs = [];
    linePos = [];

    var linePositionY = -2;
    var linePositionZ = -1;

    for (var x = 0; x <= numOfCols; x++) {
        var geometry = new THREE.Geometry();

        // i.e. 4 cols = 1, 0.75, 0.5, 0.25, 0 ...
        var directionOffset = 1 - (1 / numOfCols) * x;

        var line_from = new THREE.Vector3(0, 0, 0);
        var line_to = new THREE.Vector3(directionOffset, 10, -9);

        geometry.vertices.push(line_from);
        geometry.vertices.push(line_to);

        lineVecs.push(line_from, line_to);

        var line = new THREE.Line(geometry, material);

        /* linePositionX is a formula for evenly distributing a line at every iteration, 
           depending on the number of columns specified.
           
            x positions by numOfCols:
                2 cols:     -4, 0, 4
                3 cols:     -5, -1.67, 1.67, 5
                4 cols:     -6, -3, 0, 3, 6
                5 cols:     -7, -4.2, -1.4, 1.4, 4.2, 7 */
        var outerBounds = numOfCols + 2;
        var linePositionX = -outerBounds + x * (outerBounds * 2 / numOfCols);

        // Change z axis for overall size of the playing grid.
        line.position.set(linePositionX, linePositionY, linePositionZ);

        linePos.push({
            x: linePositionX,
            y: linePositionY,
            z: linePositionZ
        });

        scene.add(line);
    }

    /////////////////////

    var geom = new THREE.Geometry();

    geom.vertices.push(
        new THREE.Vector3(linePos[0].x, linePos[0].y, linePos[0].z),
        new THREE.Vector3(
            linePos[0].x + lineVecs[1].x,
            linePos[0].y + lineVecs[1].y,
            linePos[0].z + lineVecs[1].z
        ),
        new THREE.Vector3(
            linePos[linePos.length - 1].x + lineVecs[lineVecs.length - 1].x,
            linePos[linePos.length - 1].y + lineVecs[lineVecs.length - 1].y,
            linePos[linePos.length - 1].z + lineVecs[lineVecs.length - 1].z
        ),
        new THREE.Vector3(
            linePos[linePos.length - 1].x,
            linePos[linePos.length - 1].y,
            linePos[linePos.length - 1].z
        )
    );

    geom.faces.push(
        new THREE.Face3(0, 2, 3),
        new THREE.Face3(0, 2, 1),
        new THREE.Face3(0, 3, 2),
        new THREE.Face3(0, 3, 1)
    );
    geom.computeFaceNormals();
    var material = new THREE.MeshLambertMaterial({
        color: 0x3f3f3f,
        transparent: true,
        opacity: 0.7
    });
    var object = new THREE.Mesh(geom, material);

    scene.add(object);

    ///////////////////////////////////

    start = {
        x: lineVecs[1].x + linePos[0].x,
        y: lineVecs[1].y + linePos[0].y,
        z: lineVecs[1].z + linePos[0].z
    };

    end = {
        x: lineVecs[lineVecs.length - 1].x + linePos[linePos.length - 1].x,
        y: lineVecs[lineVecs.length - 1].y + linePos[linePos.length - 1].y,
        z: lineVecs[lineVecs.length - 1].z + linePos[linePos.length - 1].z,
    };

    movingLines = [];
    let numMovingLines = 8;
    for (var i = 0; i < numMovingLines; i++) {
        let line = i % 2 == 1 ? helpers.drawLines(THREE, start, end, 0x808080) : helpers.drawLines(THREE, start, end, 0xe9e9e9);
        movingLines.push(line);
        scene.add(line);
    }

    helpers.setOriginalXScale(movingLines[0].scale.x);
    setActiveIdx = 1;

    //////////////////////////
    // 2D array to store all possible notes on the screen at a single instance.

    notes = [];
    notesMovement = [];

    originalMeshPositions = [];
    var colColors = [
        0x00FF00, 0xFF0000, 0xFFFF00, 0x0000FF,
        0xFF7F00, 0x9400D3, 0x4B0082
    ]

    for (var i = 0; i < numMovingLines; i++) {
        notes[i] = [];
        notesMovement[i] = [];
        var idx = 1;
        for (var j = 0; j < numOfCols; j++) {
            var geometry = new THREE.SphereBufferGeometry(0.8, 8, 16, 0, 3, 0, 3);
            var material = new THREE.MeshToonMaterial({
                color: colColors[j]
            });
            var mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 4;
            mesh.rotation.z = Math.PI;
            var vecAvgX = (lineVecs[idx].x + lineVecs[idx + 2].x) / 2;
            idx += 2;
            var posAvgX = (linePos[j].x + linePos[j + 1].x) / 2;

            var crossAvgY = lineVecs[idx].y + linePositionY;
            var crossAvgZ = lineVecs[idx].z + linePositionZ;
            mesh.position.set(vecAvgX + posAvgX, crossAvgY + objOffsetY, crossAvgZ);

            // save the original positions of each note for use later
            if (i == 0) {
                originalMeshPositions.push({
                    x: mesh.position.x,
                    y: mesh.position.y,
                    z: mesh.position.z
                });
            }

            var moveVec = new THREE.Vector3(vecAvgX, 10 + objOffsetY, -9);
            notesMovement[i].push(moveVec);
            notes[i].push(mesh);
            scene.add(mesh);
        }
    }

    //////////////////////
    // RING

    circles = [];
    var rings = [];
    originalColors = [];

    for (var i = 0; i < numOfCols; i++) {
        var geometry = new THREE.RingGeometry(1, 1.1, 30, 30);
        var material = new THREE.MeshBasicMaterial({
            color: colColors[i],
            side: THREE.DoubleSide
        });
        var ring = new THREE.Mesh(geometry, material);
        ring.rotation.x = -Math.PI / 4;

        // reused
        var posAvgX = (linePos[i].x + linePos[i + 1].x) / 2;

        // adjust positions to align above grid
        // linePositionZ += 0.08;

        ring.position.set(posAvgX, linePositionY + objOffsetY - 0.2, linePositionZ + 0.2);

        rings.push(ring);
        scene.add(ring);


        var geometry = new THREE.CircleGeometry(1, 32);
        var material = new THREE.MeshBasicMaterial({
            color: helpers.darkenHex(colColors[i], 0xb0)
        });
        var circle = new THREE.Mesh(geometry, material);
        circle.rotation.x = -Math.PI / 4;
        circle.position.set(posAvgX, linePositionY + objOffsetY - 0.2, linePositionZ + 0.2);
        circles.push(circle);
        originalColors.push(circle.material.color);
        scene.add(circle);
    }

    for (var i = 0; i < numMovingLines; i++) {
        activePitches[i] = []
    }

    ////////////////////////

    document.body.addEventListener('keydown', onKeyDown, false);
    document.body.addEventListener('keyup', onKeyUp, false);
    renderer.setClearColor(0x000000, 0);
    animate();
}

function onKeyDown() {
    switch (event.keyCode) {
        case 40: // up
            camera.translateZ(0.1);
            break;
        case 39: // right
            camera.translateX(0.1);
            break;
        case 38: // down
            camera.translateZ(-0.1);
            break;
        case 37: // left
            camera.translateX(-0.1);
            break;
            // Game Controls
        case 65: // a
            lightButton(0, true);
            if (isDown[event.keyCode]) {
                return;
            }
            isDown[event.keyCode] = true;
            play.playTone(pitches.pitchD)
            break;
        case 83: // s
            if (numOfCols < 3) {
                return;
            }
            lightButton(1, true);
            if (isDown[event.keyCode]) {
                return;
            }
            isDown[event.keyCode] = true;
            play.playTone(pitches.pitchE)
            break;
        case 68: // d
            if (numOfCols < 3) {
                return;
            }
            lightButton(2, true);
            if (isDown[event.keyCode]) {
                return;
            }
            isDown[event.keyCode] = true;
            play.playTone(pitches.pitchF)
            break;
        case 70: // f
            if (numOfCols < 4) {
                return;
            }
            lightButton(3, true);
            if (isDown[event.keyCode]) {
                return;
            }
            isDown[event.keyCode] = true;
            play.playTone(pitches.pitchG)
            break;
        case 71: // g
            if (numOfCols < 5) {
                return;
            }
            lightButton(4, true);
            if (isDown[event.keyCode]) {
                return;
            }
            isDown[event.keyCode] = true;
            play.playTone(pitches.pitchA)
            break;
        case 72: // h
            if (numOfCols < 6) {
                return;
            }
            lightButton(5, true);
            if (isDown[event.keyCode]) {
                return;
            }
            isDown[event.keyCode] = true;
            play.playTone(pitches.pitchB)
            break;
        case 74: // j
            if (numOfCols < 7) {
                return;
            }
            lightButton(6, true);
            if (isDown[event.keyCode]) {
                return;
            }
            isDown[event.keyCode] = true;
            play.playTone(pitches.pitchC)
            break;
    }
}

function onKeyUp() {
    switch (event.keyCode) {
        // Game Controls
        case 65: // a
            lightButton(0, false);
            play.stopTone(pitches.pitchD);
            isDown[event.keyCode] = false;
            break;
        case 83: // s
            if (numOfCols < 2) {
                return;
            }
            lightButton(1, false);
            play.stopTone(pitches.pitchE);
            isDown[event.keyCode] = false;
            break;
        case 68: // d
            if (numOfCols < 3) {
                return;
            }
            lightButton(2, false);
            play.stopTone(pitches.pitchF);
            isDown[event.keyCode] = false;
            break;
        case 70: // f
            if (numOfCols < 4) {
                return;
            }
            lightButton(3, false);
            play.stopTone(pitches.pitchG);
            isDown[event.keyCode] = false;
            break;
        case 71: // g
            if (numOfCols < 5) {
                return;
            }
            lightButton(4, false);
            play.stopTone(pitches.pitchA);
            isDown[event.keyCode] = false;
            break;
        case 72: // h
            if (numOfCols < 6) {
                return;
            }
            lightButton(5, false);
            play.stopTone(pitches.pitchB);
            isDown[event.keyCode] = false;
            break;
        case 74: // j
            if (numOfCols < 7) {
                return;
            }
            lightButton(6, false);
            play.stopTone(pitches.pitchC);
            isDown[event.keyCode] = false;
            break;
    }
}

function lightButton(buttonIdx, keydown) {
    if (numOfCols > buttonIdx) {
        circles[buttonIdx].material.color = keydown ? new THREE.Color(0xffffff) : originalColors[buttonIdx];
        circles[buttonIdx].material.needsUpdate = true;
    }
}

function animate() {
    // creates a loop to redraw the renderer
    // every time the screen refreshes
    requestAnimationFrame(animate);
    render();
}

function render() {

    // return early to pause the game
    // if (count > 45) {
    //     return;
    // }
    // count +=0.1

    // Bases for mesh should be 100 and line is 10.
    // 10 : 100, 5 : 200, 2.5 : 400, and so on for mesh and line speed factors.
    // Change the grid speed by decimals if desired, faster is a smaller value and slower is larger.
    var speeds = game.speeds();
    var speed = speeds.hard;
    const meshSpeedFactor = 100 * speed.value;
    const lineSpeedFactor = 10 / speed.value;

    // duration between lines should be roughly 2

    var xScaleAdjust = 0.03 * numOfCols + 1.69;
    var defaultSpeed = {
        x: ((lineVecs[1].x / 1000) / xScaleAdjust) * lineSpeedFactor,
        y: (lineVecs[1].y / 1000) * lineSpeedFactor,
        z: (lineVecs[1].z / 1000) * lineSpeedFactor
    }

    // Maximum scale should be the width of the ending vector
    // over the width of the starting vector.
    var currentWidth = end.x - start.x;
    var expectedWidth = currentWidth + 1;
    var scaleMax = expectedWidth / currentWidth;

    var defaultScale = (scaleMax / (1000 * expectedWidth)) * speed.factor;

    for (var i = 0; i < movingLines.length; i++) {
        if (i >= setActiveIdx) {
            continue;
        }
        // release = releaseNotes(meshSpeedFactor, i);
        //////RELEASE NOTES
        if (currNoteLine >= notesPerLine.length) {
            // end of song
        } else {
            for (var h = 0; h < notesPerLine[currNoteLine].length; h++) {
                activePitches[i].push(notesPerLine[currNoteLine][h])
            }
            totalDuration = activePitches[currNoteLine][0].duration;
        }
        // console.log(notesPerLine)
        release = false;
        for (var j = 0; j < notes[i].length; j++) {
            let mesh = notes[i][j];

            ///// RESET
            if (mesh.position.y <= -2.3) {
                mesh.position.set(originalMeshPositions[j].x, originalMeshPositions[j].y, originalMeshPositions[j].z);
                release = true;
                // total duration is: measures * 32
                // if (skipLines == 1) {
                //     oneNote = false;
                // }
            } else {
                mesh.position.x -= notesMovement[i][j].x / meshSpeedFactor;
                mesh.position.y -= notesMovement[i][j].y / meshSpeedFactor;
                mesh.position.z -= notesMovement[i][j].z / meshSpeedFactor;
                release = false;
            }

            mesh.traverse(function (mesh) {
                mesh.visible = false;
            });

            ///// NOTE GENERATION ////
            // just setting meshes to true at certain times, every line is 2 duration
            // check by indices
            // if (skipLines == 1 && i == 3 && j == 3 && oneNote) {
            //     mesh.traverse(function (mesh) {
            //         mesh.visible = true;
            //     });
            //     // oneNote = false;
            // }

            for (var k = 0; k < activePitches.length; k++) {
                // if active for each pitch set to true
                mesh.traverse(function (mesh) {
                    mesh.visible = true;
                });
            }

        }

        if (setActiveIdx < movingLines.length &&
            movingLines[setActiveIdx - 1].position.y < -lineVecs[1].y / movingLines.length) {
            setActiveIdx++;
        }

        let line = movingLines[i];

        if (line.position.y >= -lineVecs[1].y + 0.05) {
            line.position.x -= defaultSpeed.x;
            line.position.y -= defaultSpeed.y;
            line.position.z -= defaultSpeed.z;

            // Ensure the ending line does not scale past the
            // width of the grid.
            if (line.scale.x <= scaleMax) {
                line.scale.x += defaultScale;
            }

        } else if (release) {
            // A slight hack to ensure the lines are set to zero and visible ONLY
            // when release turns true (i.e. the notes hit the bottom of the grid and reset)
            line.traverse(function (line) {
                line.visible = true;
            });
            line.position.set(0, 0, 0);
            // skipLines = (skipLines / 2).toFixed(0);
            // activePitches[i] = []
            totalNoteLine++;
        } else {
            line.scale.x = helpers.getOriginalXScale();
            line.traverse(function (line) {
                line.visible = false;
            });
        }
    }

    renderer.render(scene, camera);
}