var AudioContextFunc = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContextFunc();
var player = new WebAudioFontPlayer();
const toneFile = _tone_0300_LesPaul_sf2;
player.loader.decodeAfterLoading(audioContext, `${toneFile}`);
// Allow the pitch to hold for the entirety of keydown.
for (var i = 0; i < toneFile.zones.length; i++) {
    toneFile.zones[i].ahdsr = false;
}

module.exports = {
    playTone: function (tone) {
        this.stopTone(tone);
        tone.envelope = player.queueWaveTable(audioContext, audioContext.destination, toneFile, 0, tone.key, 999, true);
    },
    stopTone: function (tone) {
        if (tone.envelope) {
            tone.envelope.cancel();
            tone.envelope = null;
        }
    },
    pitches: function () {
        const octave = 4;
        return {
            pitchC: {
                key: 12 * (octave + 1)
            },
            pitchD: {
                key: 2 + 12 * octave
            },
            pitchE: {
                key: 4 + 12 * octave
            },
            pitchF: {
                key: 5 + 12 * octave
            },
            pitchG: {
                key: 7 + 12 * octave
            },
            pitchA: {
                key: 9 + 12 * octave
            },
            pitchB: {
                key: 11 + 12 * octave
            }
        };
    }
}