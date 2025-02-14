// server.js

// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Print the database name from the connection
    console.log('Database name:', mongoose.connection.db.databaseName);
  })
  .catch(err => console.error(err));

// Models
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, enum: ['customer', 'owner'], default: 'customer' }
}));

const MenuItem = mongoose.model('MenuItem', new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  image: String // store base64 or a URL
}));

const Order = mongoose.model('Order', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  items: [{ menuItem: mongoose.Schema.Types.ObjectId, quantity: Number }],
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
}));

// Authentication Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const user = new User({ username, password, role });
  await user.save();
  res.json({ message: 'User registered' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
  res.json({ token, role: user.role });
});

// Public route to fetch menu
app.get('/menu', async (req, res) => {
  const menu = await MenuItem.find();
  res.json(menu);
});

// Only owners can add new items
app.post('/menu', authMiddleware, async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const { name, price, description, image } = req.body;
  const item = new MenuItem({ name, price, description, image });
  await item.save();
  res.json(item);
});

app.post('/order', authMiddleware, async (req, res) => {
  const { items } = req.body;
  const order = new Order({ userId: req.user.id, items });
  await order.save();
  res.json(order);
});

// server.js (Add below your other routes)
app.delete('/menu/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Stripe Payment
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/create-payment-intent', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
