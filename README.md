💬 ChatApp

A simple real-time web chat application where users can register, log in, and send private messages to each other directly from the browser.

🚀 Features

👤 User Accounts — Register and log in with username, email, and password.

👥 User List — See all registered users in a sidebar that updates automatically.

💬 Private Conversations — Start 1-on-1 chats with any user.

📨 Messaging — Send and receive messages stored in the database.

🔄 Auto Refresh — Messages update automatically every 2 seconds.

🧰 Tech Stack
Layer	Technology
Frontend	HTML, CSS, JavaScript
Backend	Node.js, Express
Database	PostgreSQL
⚙️ Setup

Install dependencies

npm install

Create a .env file

DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=chatapp
SESSION_SECRET=secret

Run the server

node server.js

Open in browser

http://localhost:3000
🧠 Architecture

REST API connects frontend and backend (/api/users, /api/messages)

Polling every 2 seconds checks for new messages

Express serves both API and frontend

PostgreSQL stores users, conversations, and messages
