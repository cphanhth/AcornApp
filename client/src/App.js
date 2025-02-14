import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import axios from 'axios';
import './styles.css';

const stripePromise = loadStripe('your-public-stripe-key');

const App = () => {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);

  // Modal controls
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Add new menu item states
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemImage, setNewItemImage] = useState(null);

  // Always fetch the menu (public)
  useEffect(() => {
    axios.get('http://localhost:5000/menu')
      .then(res => setMenu(res.data))
      .catch(err => console.error(err));
  }, []);

  // Handle login
  const handleLogin = () => {
    axios.post('http://localhost:5000/login', { username, password })
      .then(res => {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        setToken(res.data.token);
        setRole(res.data.role);

        // Close login modal and clear fields
        setShowLoginModal(false);
        setUsername('');
        setPassword('');
      })
      .catch(err => {
        console.error(err);
        alert('Invalid credentials');
      });
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setRole(null);
  };

  // Cart toggling
  const toggleCart = (item) => {
    setCart(prevCart => {
      const isInCart = prevCart.some(cartItem => cartItem._id === item._id);
      if (isInCart) {
        return prevCart.filter(cartItem => cartItem._id !== item._id);
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  // Place order
  const placeOrder = () => {
    if (!token) {
      alert('Please login first to place an order.');
      return;
    }
    axios.post('http://localhost:5000/order',
      { items: cart },
      { headers: { Authorization: token } }
    )
      .then(() => setCart([]))
      .catch(err => console.error(err));
  };

  const totalAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Handle file input (convert to base64)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewItemImage(reader.result); // base64 string
    };
    reader.readAsDataURL(file);
  };

  // Add new menu item (owner only)
  const addNewMenuItem = () => {
    if (!token) {
      alert('Please login as owner to add menu items.');
      return;
    }
    const priceNumber = parseFloat(newItemPrice) || 0;
    axios.post('http://localhost:5000/menu',
      {
        name: newItemName,
        price: priceNumber,
        description: newItemDescription,
        image: newItemImage
      },
      { headers: { Authorization: token } }
    )
      .then(res => {
        setMenu([...menu, res.data]);
        setShowNewItemModal(false);
        // Clear fields
        setNewItemName('');
        setNewItemPrice('');
        setNewItemDescription('');
        setNewItemImage(null);
      })
      .catch(err => console.error(err));
  };

  // === NEW: Delete a menu item (owner only) ===
  const deleteMenuItem = (id) => {
    if (!token) {
      alert('Please login as owner to delete menu items.');
      return;
    }
    axios.delete(`http://localhost:5000/menu/${id}`, {
      headers: { Authorization: token }
    })
      .then(() => {
        // Filter it out of local state so it disappears immediately
        setMenu(prevMenu => prevMenu.filter(item => item._id !== id));
      })
      .catch(err => console.error(err));
  };

  return (
    <Elements stripe={stripePromise}>
      <div className="container">

        {/* Header with "Cafe Menu" and top-right login/logout */}
        <header className="header">
          <h1 className="title">Cafe Menu</h1>

          <div className="top-right-buttons">
            {!token ? (
              <button
                className="button login-button"
                onClick={() => setShowLoginModal(true)}
              >
                Login
              </button>
            ) : (
              <button
                className="button logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            )}
          </div>
        </header>

        <section className="menu-section">
          <h2 className="section-title">Our Menu</h2>
          <div className="menu-grid">
            {menu.map((item) => (
              <div key={item._id} className="menu-item">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="menu-item-image"
                  />
                )}
                <div className="menu-item-info">
  <h3>{item.name}</h3>
  <p>{item.description}</p>
  <p className="price">${item.price}</p>

  <div className="menu-item-buttons">
    <button
      onClick={() => toggleCart(item)}
      className="button"
    >
      {cart.some(cartItem => cartItem._id === item._id)
        ? 'Remove from Cart'
        : 'Add to Cart'}
    </button>

    {role === 'owner' && (
      <button
        onClick={() => deleteMenuItem(item._id)}
        className="button"
        style={{ backgroundColor: 'red', color: '#fff' }}
      >
        Delete
      </button>
    )}
  </div>
</div>

              </div>
            ))}

            {/* Only show grayed-out add button if user is owner */}
            {role === 'owner' && (
              <div
                className="menu-item grayed-out"
                style={{ opacity: 0.5, cursor: 'pointer' }}
                onClick={() => setShowNewItemModal(true)}
              >
                <div className="menu-item-info">
                  <h3 style={{ textAlign: 'center' }}>+ Add New Menu Item</h3>
                </div>
              </div>
            )}
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
                <button onClick={placeOrder} className="button">
                  Place Order
                </button>
              </>
            )}
          </div>
        </section>

        <footer className="footer">
          <p>&copy; 2025 Cafe Online Ordering. All rights reserved.</p>
        </footer>

        {/* === MODALS === */}

        {/* 1) Login Modal */}
        {showLoginModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Login</h2>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div style={{ marginTop: '10px' }}>
                <button onClick={handleLogin} className="button">
                  Login
                </button>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="button"
                  style={{ marginLeft: '10px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2) Add New Menu Item Modal */}
        {showNewItemModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h2>Add New Menu Item</h2>

      <div className="modal-form">
        {/* Row for Item Name & Price side by side */}
        <div className="modal-form-row">
          <input
            className="form-name"
            type="text"
            placeholder="Item Name"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
          />
          <input
            className="form-price"
            type="number"
            step="0.01"
            placeholder="Price"
            value={newItemPrice}
            onChange={e => setNewItemPrice(e.target.value)}
          />
        </div>

        {/* Description (full width) */}
        <textarea
          className="description-input"
          placeholder="Description"
          value={newItemDescription}
          onChange={e => setNewItemDescription(e.target.value)}
        />

        {/* File input */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />

        {/* Buttons row */}
        <div className="modal-buttons">
          <button onClick={addNewMenuItem} className="button">
            Save
          </button>
          <button
            onClick={() => setShowNewItemModal(false)}
            className="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}


      </div>
    </Elements>
  );
};

export default App;
