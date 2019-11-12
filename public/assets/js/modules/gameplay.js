module.exports = {
    speeds: function () {
        return {
            easy: {
                value: 2,
                factor: 5
            },
            medium: {
                value: 1.7,
                factor: 6.5
            },
            hard: {
                value: 1,
                factor: 9.5
            }
        }
    },
    checkArrElement: function (arr, index) {
        var start = 0;
        while (start < arr.length) {
            if (!arr[(index + start) % arr.length]) {
                return (index + start) % arr.length;
            }
            start++;
        }
        // already full
        return index % arr.length;
    }
}