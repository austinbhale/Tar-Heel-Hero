const express = require('express');
const app = express();

app.use(express.static('public'))
app.get(['/', '/index', '/index.html'], function(req, res) {
    res.sendFile('index.html', {root: __dirname })
});

app.listen(8000);