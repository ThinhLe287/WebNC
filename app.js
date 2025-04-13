const express = require('express');
const session = require('express-session');
const path = require('path'); // Import path module
const routes = require('./routes'); // Đảm bảo đường dẫn đúng
const app = express();

// Middleware để xử lý JSON và URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình session
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

// Middleware để phục vụ file tĩnh
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder

// Cấu hình view engine
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set the views directory

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Sử dụng routes
app.use('/', routes);

app.listen(4000, () => {
    console.log('Server is running on http://localhost:4000');
});
