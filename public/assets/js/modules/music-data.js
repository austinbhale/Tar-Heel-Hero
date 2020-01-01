var songs = require('./songs');
var songNames = [
    "come-a-little-closer"
];

module.exports = {
    getMusicJSON: function ($, callback) {
        var notesPerLine;
        $.getJSON("helpers/sheet-music/come-a-little-closer/come-a-little-closer.json", function (data) {
            let musicDataQueue = [];
            const defaultXBound = 4.5;

            notesPerLine = [];
            var lineCount = 0;

            for (var i = 0; i < data.length; i++) {

                // defaultX - check if same or 4.5 apart due to double digits or single
                musicDataQueue.push(data[i]);
                if (musicDataQueue.length > 1) {
                    if ((musicDataQueue[0].defaultX == musicDataQueue[1].defaultX ||
                            (musicDataQueue[0].defaultX + defaultXBound == musicDataQueue[1].defaultX) ||
                            (musicDataQueue[0].defaultX - defaultXBound == musicDataQueue[1].defaultX)) &&
                        musicDataQueue[0].measure == musicDataQueue[1].measure) {
                        notesPerLine[lineCount].push(data[i]);

                        musicDataQueue.shift();
                        continue;
                    }
                    lineCount++;
                    musicDataQueue.shift();
                }

                notesPerLine[lineCount] = []
                notesPerLine[lineCount].push(data[i]);
            }

            callback(notesPerLine);
        });
    },
    getSongData: function (songIndex, numOfCols) {
        if (songIndex == 0) {
            songIndex = Math.floor(Math.random() * songNames.length);
        } else {
            songIndex--;
        }
        switch (songNames[songIndex]) {
            case "come-a-little-closer":
                switch (numOfCols) {
                    case 1:
                        return songs.comeALittleCloser().oneCol;
                    case 2:
                        return songs.comeALittleCloser().twoCol;
                    case 4:
                        return songs.comeALittleCloser().medium;
                    case 5:
                        return songs.comeALittleCloser().hard;
                    default:
                        return songs.comeALittleCloser().easy;
                }
        }
    },
    getSong: function (songIndex, setSongIndex) {
        var name = "";
        // Random song when zero.
        if (songIndex == 0) {
            songIndex = ~~(songNames.length * Math.random());
            name = songNames[songIndex];
         } else {
            name = songNames[songIndex-1];
         }
         setSongIndex("/public/assets/audio/" + name + ".mp3", songIndex);
    }
}