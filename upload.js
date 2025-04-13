const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './image/', // Thư mục lưu ảnh
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
module.exports = upload;
