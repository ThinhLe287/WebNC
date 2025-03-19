const express = require('express');
const Product = require('./models/Product');
const multer = require('multer');
const path = require('path');
const router = express.Router();


// Trang danh sách sản phẩm
router.get('/products', async (req, res) => {
    const products = await Product.find();
    res.render('products', { products });
});

// API tạo sản phẩm
router.post('/api/products', async (req, res) => {
    const { name, description, price, stock } = req.body;
    const newProduct = new Product({ name, description, price, stock });
    await newProduct.save();
    res.send('Thêm sản phẩm thành công!');
});

// API lấy danh sách sản phẩm
router.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// Thêm sản phẩm vào giỏ hàng
router.post('/cart/add/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Sản phẩm không tồn tại!');
        }

        if (!req.session.cart) req.session.cart = [];

        let cart = req.session.cart;
        let existingProduct = cart.find(p => p._id.toString() === product._id.toString());

        if (existingProduct) {
            existingProduct.quantity += 1;
        } else {
            cart.push({
                _id: product._id.toString(),
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.image || "/image/default.jpg"
            });
        }

        req.session.cart = cart;
        res.redirect('/cart');
    } catch (error) {
        console.error('Lỗi thêm vào giỏ hàng:', error);
        res.status(500).send('Lỗi server!');
    }
});

// Xem giỏ hàng
router.get('/cart', (req, res) => {
    res.render('cart', { cart: req.session.cart || [] });
});

// Cấu hình lưu ảnh với Multer
const storage = multer.diskStorage({
    destination: './image/', // Lưu ảnh vào thư mục uploads
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Cập nhật sản phẩm bằng PUT (nếu dùng API từ Postman)
// 🟡 Route cập nhật sản phẩm
router.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, price, description } = req.body;
        const imagePath = req.file ? `/image/${req.file.filename}` : req.body.currentImage;

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { name, price, description, image: imagePath },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm!' });
        }

        res.status(200).json({ message: 'Sản phẩm đã được cập nhật!', product: updatedProduct });
    } catch (error) {
        console.error('Lỗi cập nhật sản phẩm:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi cập nhật sản phẩm!' });
    }
});

// Xóa sản phẩm
router.delete('/products/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.send('Sản phẩm đã được xóa!');
});

// Route hiển thị chi tiết sản phẩm
router.get('/product/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Sản phẩm không tồn tại');
        }
        res.render('productDetail', { product });
    } catch (error) {
        res.status(500).send('Lỗi server');
    }
});

router.get("/product/:id", async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId); // Lấy sản phẩm từ MongoDB

        if (!product) {
            return res.status(404).send("Sản phẩm không tồn tại!");
        }

        res.render("productDetail", { product }); // Render ra trang chi tiết
    } catch (error) {
        console.error(error);
        res.status(500).send("Lỗi server");
    }
});


// API thêm sản phẩm với ảnh
router.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, price, description } = req.body;
        const imagePath = req.file ? `/image/${req.file.filename}` : '';

        const newProduct = new Product({ name, price, description, image: imagePath });
        await newProduct.save();

        res.status(201).json({ message: 'Sản phẩm đã được tạo!', product: newProduct });
    } catch (error) {
        console.error('Lỗi tạo sản phẩm:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi tạo sản phẩm!' });
    }
});

// Route cập nhật sản phẩm
router.post('/cart/update/:id', (req, res) => {
    try {
        const productId = req.params.id;
        const action = req.query.action;
        if (!req.session.cart) req.session.cart = [];

        let cart = req.session.cart;
        let product = cart.find(p => p._id.toString() === productId);

        if (product) {
            if (action === "increase") {
                product.quantity += 1;
            } else if (action === "decrease" && product.quantity > 1) {
                product.quantity -= 1;
            }
        }

        req.session.cart = cart;
        res.redirect('/cart');
    } catch (error) {
        console.error('Lỗi cập nhật giỏ hàng:', error);
        res.status(500).send('Lỗi server!');
    }
});

router.post('/cart/remove/:id', (req, res) => {
    try {
        const productId = req.params.id;
        if (!req.session.cart) req.session.cart = [];

        req.session.cart = req.session.cart.filter(p => p._id.toString() !== productId);
        res.redirect('/cart');
    } catch (error) {
        console.error('Lỗi xóa sản phẩm khỏi giỏ hàng:', error);
        res.status(500).send('Lỗi server!');
    }
});

module.exports = router;
