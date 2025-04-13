const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customer: {
        name: String,
        email: String
    },
    address: String,
    paymentMethod: String,
    items: [
        {
            _id: String,
            name: String,
            price: Number,
            quantity: Number,
            image: String
        }
    ],
    total: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);
