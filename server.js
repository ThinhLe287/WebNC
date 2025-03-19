const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const connectDB = require('./db');
const productRoutes = require('./routes');

const app = express();
const PORT = 4000;

// Kết nối DB
connectDB();

// Cấu hình middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use('/image', express.static(path.join(__dirname, 'image')));


// Cấu hình thư mục tĩnh
app.use(express.static('public'));

// Cấu hình view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Sử dụng routes
app.use('/', productRoutes);

// Lắng nghe cổng
app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại: http://localhost:${PORT}`);
});
