var $ = require("jquery");
var THREE = require('three');
var helpers = require('./modules/grid-helpers');
var notesData = require('./modules/music-data');
var play = require('./modules/play-sound');
var game = require('./modules/gameplay');

const pitches = play.pitches();

// Main THREE.js template.
var scene, camera, renderer;

// Keydown/Keyup differentiation.
var isDown = {};
var resetIsDown;
var alreadyHit = false;
var multipleHits = 0;

// Grid variables.
var start, end, movingLines, setActiveIdx;
var notes, notesMovement
var numOfCols = 3;
var originalMeshPositions;
var lineVecs, linePos;
var circles, originalColors;

// Note frequency.
var currNoteLine = -1; // going through the json
var activePitches;
var release;

// Read JSON data.
var notesPerLine;

// Score features.
var totalScore = document.getElementById('score');
var notesInRow = document.getElementById('notes-in-row');
var multiplier = document.getElementById('multiplier');
var countdown = document.getElementById('countdown');
var pauseTrack = false;
var pause = document.getElementById('pause');
var count = 0;
var scoreCount = 0;
var multiplierCount = 1;
var totalNotes = 0;
var hitNotes = 0;
totalScore.innerText = 0;
notesInRow.innerText = 0;
multiplier.innerText = "1x";

var countdownAmt, countDownInterval;
var audio;

var guitarMode;
var venueIndex = 0;
var songIndex = 0;

getMenuChoice();

function getMenuChoice() {
    var instructions = document.getElementById("instructions");
    instructions.addEventListener('click', () => {
        var instructionsCtr = document.getElementById('instructions-ctr');
        instructionsCtr.classList.contains('hide') ? instructionsCtr.classList.remove('hide') : instructionsCtr.classList.add('hide');
    });

    var diffList = document.getElementById('difficulty-list');
    var target = document.getElementById('default-diff');
    var oldTarget = target;
    diffList.addEventListener('click', (event) => {

        target = event.target.closest('li');
        if (target == undefined) {
            return;
        }
        oldTarget.children[0].style.visibility = "hidden";
        target.children[0].style.visibility = "visible";
        oldTarget = target;
        const index = [...target.parentElement.children].indexOf(target)
        numOfCols = index + 1;
    });

    var songList = document.getElementById('song-list');
    var songTarget = document.getElementById('default-song');
    var oldSongTarget = songTarget;
    var oldSongIdx = [...songTarget.parentElement.children].indexOf(songTarget);
    songList.addEventListener('click', (event) => {
        songTarget = event.target.closest('li');
        if (songTarget == undefined) {
            return;
        }
        oldSongTarget.style.background = "none";
        songTarget.style.backgroundColor = "#663399bb";
        oldSongTarget = songTarget;
        songIndex = [...songTarget.parentElement.children].indexOf(songTarget);

        var imgs = document.getElementById("album-list");
        imgs.children[oldSongIdx].id = "";
        imgs.children[songIndex].id = "default-img";
        oldSongIdx = songIndex;
    });

    var venueList = document.getElementById('venue-list');
    var venueTarget = document.getElementById('default-venue');
    var oldVenueTarget = venueTarget;
    venueList.addEventListener('click', (event) => {
        venueTarget = event.target.closest('li');
        if (venueTarget == undefined) {
            return;
        }
        oldVenueTarget.style.background = "none";
        venueTarget.style.backgroundColor = "#663399bb";
        oldVenueTarget = venueTarget;
        venueIndex = [...venueTarget.parentElement.children].indexOf(venueTarget);
    });


    var menu = document.getElementById("main-menu");
    var gameFeatures = document.getElementById("game-features");

    var playBtn = document.getElementById('play-btn');
    playBtn.addEventListener('click', () => {
        menu.style.display = "none";
        gameFeatures.style.display = "block";
        notesData.getMusicJSON($, function (data) {
            notesPerLine = data;

            audio = new Audio(helpers.getSong(songIndex));
            audio.loop = false;
            audio.addEventListener("ended", function () {
                audio.currentTime = 0;
                console.log("ended");
                console.log(currNoteLine);
            });

            guitarMode = false;
            init();
        });
    });

    var guitarBtn = document.getElementById('song-btn');
    guitarBtn.addEventListener('click', () => {
        menu.style.display = "none";
        gameFeatures.style.display = "block";
        notesData.getMusicJSON($, function (data) {
            notesPerLine = data;
            guitarMode = true;
            init();
        });
    });
    //// remove during production
    // menu.style.display = "none";
    // gameFeatures.style.display = "block";
    // notesData.getMusicJSON($, function (data) {
    //     notesPerLine = data;

    //     audio = new Audio(helpers.getSong(songIndex));
    //     audio.loop = false;
    //     audio.addEventListener("ended", function () {
    //         audio.currentTime = 0;
    //         console.log("ended");
    //         console.log(currNoteLine);
    //     });

    //     guitarMode = false;
    //     init();
    // });
    ////
}

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
    var imgSrc = helpers.getStage(venueIndex);
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
    const objOffsetY = 0.1;

    originalMeshPositions = [];
    var colColors = [
        0x00FF00, 0xFF0000, 0xFFFF00, 0x0000FF, 0xFF7F00
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
            mesh.traverse(function (mesh) {
                mesh.visible = false;
            });
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

    activePitches = {
        oneCol: getNotes(1),
        twoCol: getNotes(2),
        easy: getNotes(3),
        medium: getNotes(4),
        hard: getNotes(5)
    };

    activePitches = ((numOfCols) => {
        switch (numOfCols) {
            case 1:
                return activePitches.oneCol;
            case 2:
                return activePitches.twoCol;
            case 4:
                return activePitches.medium;
            case 5:
                return activePitches.hard;
            default:
                return activePitches.easy;
        }
    })(numOfCols);

    activePitches = notesData.getSongData("come-a-little-closer", numOfCols);

    ////////////////////////
    // set isdown to false initially
    for (var i = 0; i < numOfCols; i++) {
        isDown[i] = false;
    }
    resetIsDown = isDown;

    document.body.addEventListener('keydown', onKeyDown, false);
    document.body.addEventListener('keyup', onKeyUp, false);
    renderer.setClearColor(0x000000, 0);
    pause.addEventListener('click', () => {
        if (pauseTrack) {
            pauseTrack = false;
            pause.innerText = "Pause";
            countdownAmt = 3;
            countdown.innerText = countdownAmt;
            countDownInterval = setInterval(countDown, 1000);
        } else {
            pauseTrack = true;
            if (!guitarMode) {
                audio.pause();
            }
            pause.innerText = "Resume";
            clearInterval(countDownInterval);
            countdown.innerHTML = "";
            animate()
        }
    });
    animate();
}

function getNotes(cols) {
    var activePitches = [];
    var currNoteLine = 0;
    var iterable = 0;
    var duration_dist = 0;
    while (currNoteLine < notesPerLine.length) {
        activePitches[iterable] = [];

        const pitches = [];
        for (var i = 0; i < cols; i++) {
            pitches[i] = false;
        }

        if (duration_dist == 0) {
            for (var i = 0; i < notesPerLine[currNoteLine].length; i++) {
                duration_dist = notesPerLine[currNoteLine][i].duration - 2;
                switch (notesPerLine[currNoteLine][i].pitch) {
                    case "A":
                        pitches[game.checkArrElement(pitches, 0)] = true;
                        break;
                    case "B":
                        pitches[game.checkArrElement(pitches, 1)] = true;
                        break;
                    case "C":
                        pitches[game.checkArrElement(pitches, 2)] = true;
                        break;
                    case "D":
                        pitches[game.checkArrElement(pitches, 3)] = true;
                        break;
                    case "E":
                        pitches[game.checkArrElement(pitches, 4)] = true;
                        break;
                    case "F":
                        pitches[game.checkArrElement(pitches, 5)] = true;
                        break;
                    case "G":
                        pitches[game.checkArrElement(pitches, 6)] = true;
                        break;
                }
            }
            currNoteLine++;
        } else {
            duration_dist -= 2;
        }

        activePitches[iterable] = pitches;
        iterable++;
    }

    return activePitches;
}

function countDown() {
    countdownAmt--;
    if (countdownAmt == 0) {
        clearInterval(countDownInterval);
        countdown.innerHTML = "";
        if (!guitarMode) {
            audio.play();
        }
        animate();
    } else {
        countdown.innerText = countdownAmt;
    }
}

function checkCollision() {
    let hitBound = activePitches[currNoteLine - movingLines.length + 1];
    if (JSON.stringify(hitBound) == JSON.stringify(resetIsDown) && !alreadyHit) {
        for (var i = 0; i < hitBound.length; i++) {
            if (hitBound[i]) {
                multipleHits++;
            }
        }
        alreadyHit = true;
        count++;
        hitNotes++;
        scoreCount += count * multiplierCount;
    } else if (multipleHits > 0) {
        multipleHits--;
    } else {
        count = 0;
        multipleHits = 0;
    }
}

function onKeyDown() {
    switch (event.keyCode) {
        case 40: // up
            camera.translateZ(0.1);
            break;
        case 38: // down
            camera.translateZ(-0.1);
            break;
            // Game Controls
        case 65: // a
            lightButton(0, true);
            if (isDown[0]) {
                return;
            }
            isDown[0] = true;
            resetIsDown[0] = true;
            if (guitarMode) {
                play.playTone(pitches.pitchD)
            }
            break;
        case 83: // s
            if (numOfCols < 2) {
                return;
            }
            lightButton(1, true);
            if (isDown[1]) {
                return;
            }
            isDown[1] = true;
            resetIsDown[1] = true;
            if (guitarMode) {
                play.playTone(pitches.pitchE)
            }
            break;
        case 68: // d
            if (numOfCols < 3) {
                return;
            }
            lightButton(2, true);
            if (isDown[2]) {
                return;
            }
            isDown[2] = true;
            resetIsDown[2] = true;
            if (guitarMode) {
                play.playTone(pitches.pitchF)
            }
            break;
        case 70: // f
            if (numOfCols < 4) {
                return;
            }
            lightButton(3, true);
            if (isDown[3]) {
                return;
            }
            isDown[3] = true;
            resetIsDown[3] = true;
            if (guitarMode) {
                play.playTone(pitches.pitchG)
            }
            break;
        case 71: // g
            if (numOfCols < 5) {
                return;
            }
            lightButton(4, true);
            if (isDown[4]) {
                return;
            }
            isDown[4] = true;
            resetIsDown[4] = true;
            if (guitarMode) {
                play.playTone(pitches.pitchA)
            }
            break;
    }
    checkCollision();
}

function onKeyUp() {
    switch (event.keyCode) {
        // Game Controls
        case 65: // a
            lightButton(0, false);
            play.stopTone(pitches.pitchD);
            isDown[0] = false;
            break;
        case 83: // s
            if (numOfCols < 2) {
                return;
            }
            lightButton(1, false);
            play.stopTone(pitches.pitchE);
            isDown[1] = false;
            break;
        case 68: // d
            if (numOfCols < 3) {
                return;
            }
            lightButton(2, false);
            play.stopTone(pitches.pitchF);
            isDown[2] = false;
            break;
        case 70: // f
            if (numOfCols < 4) {
                return;
            }
            lightButton(3, false);
            play.stopTone(pitches.pitchG);
            isDown[3] = false;
            break;
        case 71: // g
            if (numOfCols < 5) {
                return;
            }
            lightButton(4, false);
            play.stopTone(pitches.pitchA);
            isDown[4] = false;
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
    var id = requestAnimationFrame(animate);
    if (currNoteLine >= activePitches.length + movingLines.length || pauseTrack) {
        cancelAnimationFrame(id);
    } else {
        render();
    }

    // var accuracy = Math.round((hitNotes / totalNotes) * 100);
    // console.log(accuracy);
}

// var duration = audio.duration; // 229.877551

function render() {

    if (currNoteLine == movingLines.length - 1 && !guitarMode) {
        // console.timeEnd("t");
        // console.log(audio.duration)
        // console.log(activePitches.length)
        audio.play();
    }

    // Bases for mesh should be 100 and line is 10.
    // 10 : 100, 5 : 200, 2.5 : 400, and so on for mesh and line speed factors.
    // Change the grid speed by decimals if desired, faster is a smaller value and slower is larger.
    var speeds = game.speeds();
    var speed = ((numOfCols) => {
        switch (numOfCols) {
            case 4:
                return speeds.medium;
            case 5:
                return speeds.hard;
            default:
                return speeds.easy;
        }
    })(numOfCols);

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

        //////RELEASE NOTES
        release = false;
        var firstOne = true;
        for (var j = 0; j < notes[i].length; j++) {
            let mesh = notes[i][j];

            ///// RESET
            if (mesh.position.y <= -2.2) {
                mesh.position.set(originalMeshPositions[j].x, originalMeshPositions[j].y, originalMeshPositions[j].z);
                release = true;
                // reset the notes in a row count
                if (mesh.visible && !alreadyHit) {
                    count = 0;
                }

                if (mesh.visible && firstOne) {
                    totalNotes++;
                    firstOne = false;
                }

                mesh.traverse(function (mesh) {
                    mesh.visible = false;
                });
            } else {
                mesh.position.x -= notesMovement[i][j].x / meshSpeedFactor;
                mesh.position.y -= notesMovement[i][j].y / meshSpeedFactor;
                mesh.position.z -= notesMovement[i][j].z / meshSpeedFactor;
                release = false;
            }

            if (i == currNoteLine % movingLines.length && activePitches[currNoteLine][j]) {
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
            // Ensure the lines are set to zero and visible ONLY
            // when release turns true (i.e. the notes hit the bottom of the grid and reset)
            line.traverse(function (line) {
                line.visible = true;
            });
            line.position.set(0, 0, 0);
            currNoteLine++;
            // console.time("t");
            resetIsDown = new Array(numOfCols).fill(false);
            alreadyHit = false;
            notesInRow.innerText = count;
            multiplierCount = (Math.floor((count / 10) + 1) > 4) ? 4 : Math.floor((count / 10) + 1);
            multiplier.innerText = (multiplierCount > 4) ? "4x" : multiplierCount + "x";
            totalScore.innerText = scoreCount;
        } else {
            line.scale.x = helpers.getOriginalXScale();
            line.traverse(function (line) {
                line.visible = false;
            });
        }
    }

    renderer.render(scene, camera);
}