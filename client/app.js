// Base URL for the backend API
const API = 'http://localhost:3000/api';

// Global session state
let currentUser = null;           // { id, username }
let currentConversationId = null; // ID of the active conversation
let pollingInterval = null;       // Interval reference for message polling

// ─────────────────────────────────────────
// NAVIGATION UTILITIES
// ─────────────────────────────────────────

// Shows one screen and hides all others
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

// ─────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────

// Registers a new user
async function register() {
  const username = document.getElementById('register-username').value.trim();
  const email    = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();

  if (!username || !email || !password) {
    alert('Please fill in all fields');
    return;
  }

  try {
    const res = await fetch(`${API}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Registration failed');
      return;
    }

    alert('Account created! Please log in.');
    showScreen('login-screen');
  } catch (err) {
    alert('Could not connect to the server');
  }
}

// Logs in with username and password
async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) {
    alert('Please fill in all fields');
    return;
  }

  try {
    const res = await fetch(`${API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Invalid credentials');
      return;
    }

    // Save the user in memory and localStorage to persist the session
    currentUser = data;
    localStorage.setItem('chatUser', JSON.stringify(data));

    enterChat();
  } catch (err) {
    alert('Could not connect to the server');
  }
}

// Logs out and returns to the login screen
function logout() {
  currentUser = null;
  currentConversationId = null;
  clearInterval(pollingInterval);
  localStorage.removeItem('chatUser');
  showScreen('login-screen');
}

// ─────────────────────────────────────────
// MAIN CHAT
// ─────────────────────────────────────────

// Initializes the chat screen after logging in
async function enterChat() {
  // Display the current user's name in the sidebar
  document.getElementById('current-username').textContent = `👤 ${currentUser.username}`;

  showScreen('chat-screen');

  // Load the list of all users (excluding the current one)
  await loadUsers();

  // Keep the user list fresh even before opening a conversation
  setInterval(loadUsers, 5000);
}

// Loads all users and displays them in the sidebar
async function loadUsers() {
  try {
    const res = await fetch(`${API}/users`);
    const users = await res.json();

    const list = document.getElementById('users-list');
    list.innerHTML = '';

    users
      .filter(u => u.id !== currentUser.id) // Exclude the current user
      .forEach(user => {
        const li = document.createElement('li');
        li.textContent = `👤 ${user.username}`;
        li.dataset.userId = user.id;
        li.dataset.username = user.username;

        // On click, open a conversation with that user
        li.onclick = () => openConversation(user.id, user.username, li);

        list.appendChild(li);
      });
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

// Opens or creates a conversation with the selected user
async function openConversation(otherUserId, otherUsername, liElement) {
  // Highlight the active user in the sidebar
  document.querySelectorAll('#users-list li').forEach(li => li.classList.remove('active'));
  liElement.classList.add('active');

  // Update the chat header
  document.getElementById('chat-header').textContent = `💬 ${otherUsername}`;

  try {
    // Create the conversation if it doesn't exist (backend prevents duplicates)
    const res = await fetch(`${API}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user1_id: currentUser.id, user2_id: otherUserId })
    });

    const conversation = await res.json();
    currentConversationId = conversation.id;

    // Enable the message input and send button
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('message-input').focus();

    // Load messages and start polling
    await loadMessages();
    startPolling();
  } catch (err) {
    console.error('Error opening conversation:', err);
  }
}

// ─────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────

// Loads and renders messages for the active conversation
async function loadMessages() {
  if (!currentConversationId) return;

  try {
    const res = await fetch(`${API}/messages/${currentConversationId}`);
    const messages = await res.json();

    const area = document.getElementById('messages-area');
    area.innerHTML = '';

    if (messages.length === 0) {
      area.innerHTML = '<p class="placeholder">No messages yet. Say hi! 👋</p>';
      return;
    }

    // Render each message as a chat bubble
    messages.forEach(msg => {
      const div = document.createElement('div');

      // Determine if the message belongs to the current user or the other
      const isMine = msg.username === currentUser.username;
      div.classList.add('message', isMine ? 'mine' : 'theirs');

      // Format the timestamp
      const time = new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      div.innerHTML = `
        <div>${msg.content}</div>
        <div class="meta">${isMine ? 'You' : msg.username} · ${time}</div>
      `;

      area.appendChild(div);
    });

    // Auto-scroll to the latest message
    area.scrollTop = area.scrollHeight;
  } catch (err) {
    console.error('Error loading messages:', err);
  }
}

// Sends a new message
async function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();

  // Do not send if the input is empty
  if (!content || !currentConversationId) return;

  try {
    await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: currentUser.id,
        content: content,
        conversation_id: currentConversationId
      })
    });

    // Clear the input and reload messages
    input.value = '';
    await loadMessages();
  } catch (err) {
    console.error('Error sending message:', err);
  }
}

// ─────────────────────────────────────────
// POLLING (auto-refresh)
// ─────────────────────────────────────────

// Starts polling: reloads messages every 2 seconds and refreshes the user list every 5 seconds
function startPolling() {
  clearInterval(pollingInterval); // Clear any existing interval first
  pollingInterval = setInterval(loadMessages, 2000);

  // Also refresh the user list every 5 seconds so new users appear automatically
  setInterval(loadUsers, 5000);
}

// ─────────────────────────────────────────
// INIT: restore session if one exists
// ─────────────────────────────────────────
(function init() {
  const saved = localStorage.getItem('chatUser');
  if (saved) {
    currentUser = JSON.parse(saved);
    enterChat();
  } else {
    showScreen('login-screen');
  }
})();

// ─────────────────────────────────────────
// UTILIDADES DE NAVEGACIÓN
// ─────────────────────────────────────────

// Muestra una pantalla y oculta las demás
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

// ─────────────────────────────────────────
// AUTENTICACIÓN
// ─────────────────────────────────────────

// Registra un nuevo usuario
async function register() {
  const username = document.getElementById('register-username').value.trim();
  const email    = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();

  if (!username || !email || !password) {
    alert('Por favor llena todos los campos');
    return;
  }

  try {
    const res = await fetch(`${API}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error al registrarse');
      return;
    }

    alert('¡Cuenta creada! Ahora inicia sesión.');
    showScreen('login-screen');
  } catch (err) {
    alert('No se pudo conectar al servidor');
  }
}

// Inicia sesión con username y password
async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) {
    alert('Por favor llena todos los campos');
    return;
  }

  try {
    const res = await fetch(`${API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Credenciales inválidas');
      return;
    }

    // Guardar usuario en memoria y en localStorage para persistir sesión
    currentUser = data;
    localStorage.setItem('chatUser', JSON.stringify(data));

    enterChat();
  } catch (err) {
    alert('No se pudo conectar al servidor');
  }
}

// Cierra sesión y regresa al login
function logout() {
  currentUser = null;
  currentConversationId = null;
  clearInterval(pollingInterval);
  localStorage.removeItem('chatUser');
  showScreen('login-screen');
}

// ─────────────────────────────────────────
// CHAT PRINCIPAL
// ─────────────────────────────────────────

// Inicializa la pantalla de chat después de iniciar sesión
async function enterChat() {
  // Mostrar el nombre del usuario en el sidebar
  document.getElementById('current-username').textContent = `👤 ${currentUser.username}`;

  showScreen('chat-screen');

  // Cargar la lista de todos los usuarios (excepto el actual)
  await loadUsers();
}

// Carga todos los usuarios y los muestra en el sidebar
async function loadUsers() {
  try {
    const res = await fetch(`${API}/users`);
    const users = await res.json();

    const list = document.getElementById('users-list');
    list.innerHTML = '';

    users
      .filter(u => u.id !== currentUser.id) // Excluir al usuario actual
      .forEach(user => {
        const li = document.createElement('li');
        li.textContent = `👤 ${user.username}`;
        li.dataset.userId = user.id;
        li.dataset.username = user.username;

        // Al hacer click, abrir conversación con ese usuario
        li.onclick = () => openConversation(user.id, user.username, li);

        list.appendChild(li);
      });
  } catch (err) {
    console.error('Error cargando usuarios:', err);
  }
}

// Abre o crea una conversación con el usuario seleccionado
async function openConversation(otherUserId, otherUsername, liElement) {
  // Marcar el usuario activo en el sidebar
  document.querySelectorAll('#users-list li').forEach(li => li.classList.remove('active'));
  liElement.classList.add('active');

  // Actualizar el encabezado del chat
  document.getElementById('chat-header').textContent = `💬 ${otherUsername}`;

  try {
    // Crear la conversación si no existe (el backend evita duplicados)
    const res = await fetch(`${API}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user1_id: currentUser.id, user2_id: otherUserId })
    });

    const conversation = await res.json();
    currentConversationId = conversation.id;

    // Habilitar el input y el botón de enviar
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('message-input').focus();

    // Cargar mensajes y empezar polling
    await loadMessages();
    startPolling();
  } catch (err) {
    console.error('Error abriendo conversación:', err);
  }
}

// ─────────────────────────────────────────
// MENSAJES
// ─────────────────────────────────────────

// Carga y muestra los mensajes de la conversación activa
async function loadMessages() {
  if (!currentConversationId) return;

  try {
    const res = await fetch(`${API}/messages/${currentConversationId}`);
    const messages = await res.json();

    const area = document.getElementById('messages-area');
    area.innerHTML = '';

    if (messages.length === 0) {
      area.innerHTML = '<p class="placeholder">No hay mensajes aún. ¡Escribe el primero! 👋</p>';
      return;
    }

    // Renderizar cada mensaje como burbuja
    messages.forEach(msg => {
      const div = document.createElement('div');

      // Determinar si el mensaje es mío o del otro
      const isMine = msg.username === currentUser.username;
      div.classList.add('message', isMine ? 'mine' : 'theirs');

      // Formatear la hora
      const time = new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      div.innerHTML = `
        <div>${msg.content}</div>
        <div class="meta">${isMine ? 'Tú' : msg.username} · ${time}</div>
      `;

      area.appendChild(div);
    });

    // Hacer scroll al último mensaje automáticamente
    area.scrollTop = area.scrollHeight;
  } catch (err) {
    console.error('Error cargando mensajes:', err);
  }
}

// Envía un nuevo mensaje
async function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();

  // No enviar si el input está vacío
  if (!content || !currentConversationId) return;

  try {
    await fetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: currentUser.id,
        content: content,
        conversation_id: currentConversationId
      })
    });

    // Limpiar el input y recargar mensajes
    input.value = '';
    await loadMessages();
  } catch (err) {
    console.error('Error enviando mensaje:', err);
  }
}

// ─────────────────────────────────────────
// POLLING (actualización automática)
// ─────────────────────────────────────────

// Inicia el polling: recarga mensajes cada 2 segundos
function startPolling() {
  clearInterval(pollingInterval); // Limpiar intervalo anterior si existe
  pollingInterval = setInterval(loadMessages, 2000);
}

// ─────────────────────────────────────────
// INICIO: restaurar sesión si existe
// ─────────────────────────────────────────
(function init() {
  const saved = localStorage.getItem('chatUser');
  if (saved) {
    currentUser = JSON.parse(saved);
    enterChat();
  } else {
    showScreen('login-screen');
  }
})();
