const express = require('express');
const path = require('path');
const app = express();
const PORT = 4000;

app.use('/image', express.static(path.join(__dirname, 'image')));

app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại: http://localhost:${PORT}`);
});
