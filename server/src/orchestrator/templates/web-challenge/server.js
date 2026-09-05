const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Challenge</title>
      <style>
        body { 
          font-family: monospace; 
          background: #0a0e27; 
          color: #00ff41; 
          padding: 2rem;
        }
        .container { max-width: 800px; margin: 0 auto; }
        input, button { 
          padding: 0.5rem; 
          margin: 0.5rem 0; 
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Web Challenge</h1>
        <!-- FLAG{html_comments_are_visible} -->
        <p>Find the flag hidden in this page!</p>
        <form action="/submit" method="POST">
          <input type="text" name="flag" placeholder="Enter flag" required />
          <button type="submit">Submit</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(\`Challenge running on port \${PORT}\`);
});
