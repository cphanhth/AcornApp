import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import axios from 'axios';
import './styles.css';

const stripePromise = loadStripe('your-public-stripe-key');

const App = () => {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));

  useEffect(() => {
    const sampleMenu = [
      {
        name: "Latte",
        price: 4.5,
        description: "A rich and creamy coffee beverage",
        image: "https://www.jerseygirlcooks.com/wp-content/uploads/2023/05/12x12-vanilla-latte-500x375.jpg"
      },
      {
        name: "Cappuccino",
        price: 4.0,
        description: "Espresso with steamed milk foam",
        image: "https://res.cloudinary.com/perkchops/image/upload/v1600281166/product/20208162132/tbvzfxnkfz5goonm6hlp.jpg"
      },
      {
        name: "Espresso",
        price: 3.0,
        description: "A strong and bold coffee shot",
        image: "https://www.thespruceeats.com/thmb/HJrjMfXdLGHbgMhnM0fMkDx9XPQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/what-is-espresso-765702-hero-03_cropped-ffbc0c7cf45a46ff846843040c8f370c.jpg"
      },
      {
        name: "Matcha Latte",
        price: 5.0,
        description: "Green tea mixed with steamed milk",
        image: "https://munchingwithmariyah.com/wp-content/uploads/2020/06/IMG_0748-600x600.jpg"
      },
      {
        name: "Mocha",
        price: 4.8,
        description: "Espresso, chocolate, and steamed milk",
        image: "https://www.thespruceeats.com/thmb/Hz677yfVdPECquUOekjv0b9yXTE=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/SES-mocha-4797918-step-04-599987714aec41aba02f1f870e900dd8.jpg"
      }
    ];
    setMenu(sampleMenu);
  }, []);

  const toggleCart = (item) => {
    setCart((prevCart) => {
      const isInCart = prevCart.some(cartItem => cartItem.name === item.name);
      if (isInCart) {
        return prevCart.filter(cartItem => cartItem.name !== item.name);
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  const placeOrder = () => {
    axios.post('http://localhost:5000/order', { items: cart }, { headers: { Authorization: token } })
      .then(() => setCart([]))
      .catch(err => console.error(err));
  };

  const totalAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <Elements stripe={stripePromise}>
      <div className="container">
        <header className="header">
          <h1 className="title">Cafe Menu</h1>
        </header>
        <section className="menu-section">
          <h2 className="section-title">Our Menu</h2>
          <div className="menu-grid">
            {menu.map((item, index) => (
              <div key={index} className="menu-item">
                <img src={item.image} alt={item.name} className="menu-item-image" />
                <div className="menu-item-info">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <p className="price">${item.price}</p>
                  <button onClick={() => toggleCart(item)} className="button">
                    {cart.some(cartItem => cartItem.name === item.name) ? 'Remove from Cart' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="cart-section">
          <h2 className="section-title">Your Cart</h2>
          <div className="cart">
            {cart.length > 0 ? (
              cart.map((item, index) => (
                <div key={index} className="cart-item">
                  <p>{item.name} x {item.quantity}</p>
                </div>
              ))
            ) : (
              <p className="empty-cart">Your cart is empty</p>
            )}
            {cart.length > 0 && (
              <>
                <p className="total">Total: ${totalAmount.toFixed(2)}</p>
                <button onClick={placeOrder} className="button">Place Order</button>
              </>
            )}
          </div>
        </section>
        <footer className="footer">
          <p>&copy; 2025 Cafe Online Ordering. All rights reserved.</p>
        </footer>
      </div>
    </Elements>
  );
};

export default App;
