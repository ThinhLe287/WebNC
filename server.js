const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const connectDB = require('./db');
const routes = require('./routes');

const app = express();
const PORT = 4000;

// Kết nối DB
connectDB();

// Cấu hình middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'secretkey', // Khóa bí mật cho session
        resave: false,
        saveUninitialized: true,
    })
);
app.use('/image', express.static(path.join(__dirname, 'image')));

// Cấu hình thư mục tĩnh
app.use(express.static('public'));

// Cấu hình view engine
app.set('view engine', 'ejs');
app.set('views', './views');

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});
// Sử dụng routes
app.use('/', routes);

// Route mặc định
app.get('/', (req, res) => {
    if (req.session.user) {
        res.render('index', { user: req.session.user }); // Trang chủ khi đã đăng nhập
    } else {
        res.redirect('/login'); // Chuyển hướng đến trang đăng nhập nếu chưa đăng nhập
    }
});

// Lắng nghe cổng
app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại: http://localhost:${PORT}`);
});