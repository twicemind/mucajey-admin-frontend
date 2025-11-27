import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const userFilePath = path.join(__dirname, '../data/user/user.json');
const normalizeEnvValue = (value) => (typeof value === 'string' ? value.trim() : '');
const MUCAJEY_API_BASE_URL =
  normalizeEnvValue(process.env.ADMIN_FRONTEND_MUCAJEY_API_INTERNAL_URL) ||
  normalizeEnvValue(process.env.ADMIN_FRONTEND_MUCAJEY_API_URL) ||
  normalizeEnvValue(process.env.MUCAJEY_API_URL) ||
  'http://mucajey-api:3000';
const MUCAJEY_REGISTER_PATH = normalizeEnvValue(process.env.ADMIN_FRONTEND_MUCAJEY_REGISTER_PATH) || '/register';
const MUCAJEY_REGISTER_URL = (() => {
  try {
    return new URL(MUCAJEY_REGISTER_PATH, MUCAJEY_API_BASE_URL).toString();
  } catch {
    console.warn(`Invalid mucajey API register path/base combo: ${MUCAJEY_REGISTER_PATH} + ${MUCAJEY_API_BASE_URL}`);
    return null;
  }
})();
const MUCAJEY_APP_NAME = normalizeEnvValue(process.env.ADMIN_FRONTEND_APP_NAME) || 'mucajey-admin-frontend';
const MUCAJEY_APP_VERSION = normalizeEnvValue(process.env.ADMIN_FRONTEND_APP_VERSION);
const MUCAJEY_PLATFORM = normalizeEnvValue(process.env.ADMIN_FRONTEND_PLATFORM) || 'admin-frontend';
const MUCAJEY_DEVICE_ID_PREFIX = normalizeEnvValue(process.env.ADMIN_FRONTEND_DEVICE_ID_PREFIX) || 'admin-frontend';
const MUCAJEY_API_KEY_HEADER = normalizeEnvValue(process.env.ADMIN_FRONTEND_MUCAJEY_API_KEY);
const DEFAULT_TYPE = 'user';

function canonicalType(value) {
  return value === 'admin' ? 'admin' : DEFAULT_TYPE;
}

function normalizeEntry(entry) {
  return {
    username: typeof entry.username === 'string' ? entry.username.trim() : '',
    password: typeof entry.password === 'string' ? entry.password : '',
    type: canonicalType(entry.type),
    apiKey: typeof entry.apiKey === 'string' ? entry.apiKey.trim() : '',
  };
}

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'mucajey-session',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.username));
passport.deserializeUser(async (username, done) => {
  try {
    const users = await loadUsers();
    const found = users.find((entry) => entry.username === username);
    done(
      null,
      found
        ? {
            username: found.username,
            type: found.type,
            apiKey: found.apiKey,
          }
        : false
    );
  } catch (error) {
    done(error);
  }
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const users = await loadUsers();
      const index = users.findIndex((entry) => entry.username === username);
      if (index === -1) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      const user = users[index];

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      const updatedUser = await ensureUserHasApiKey(users, index);
      return done(null, {
        username: updatedUser.username,
        type: updatedUser.type,
        apiKey: updatedUser.apiKey,
      });
    } catch (error) {
      done(error);
    }
  })
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

function ensureAdmin(req, res, next) {
  if (!req.isAuthenticated() || req.user?.type !== 'admin') {
    return res.status(403).json({ error: 'Admins only' });
  }
  next();
}

app.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) {
      return next(error);
    }
    if (!user) {
      return res.status(401).json({ error: info?.message ?? 'Invalid credentials' });
    }

    req.logIn(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }
      res.json({ user: { username: user.username, type: user.type, apiKey: user.apiKey } });
    });
  })(req, res, next);
});

app.post('/auth/logout', (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }
    if (req.session) {
      req.session.destroy(() => res.sendStatus(204));
    } else {
      res.sendStatus(204);
    }
  });
});

app.get('/auth/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ user: { username: req.user.username, type: req.user.type, apiKey: req.user.apiKey } });
});

app.get('/auth/users', ensureAdmin, async (req, res, next) => {
  try {
    const users = await loadUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

app.post('/auth/users', ensureAdmin, async (req, res, next) => {
  const { username, password, type } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const users = await loadUsers();
    if (users.some((entry) => entry.username === username)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const updated = [
      ...users,
      { username, password: hashed, type: canonicalType(type), apiKey: '' },
    ];
    await saveUsers(updated);
    res.status(201).json({ username, type: canonicalType(type) });
  } catch (error) {
    next(error);
  }
});

app.post('/auth/users/password', ensureAuthenticated, async (req, res, next) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!newPassword) {
    return res.status(400).json({ error: 'newPassword is required' });
  }

  try {
    const users = await loadUsers();
    const index = users.findIndex((entry) => entry.username === req.user.username);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.type !== 'admin') {
      if (!currentPassword) {
        return res.status(400).json({ error: 'currentPassword is required' });
      }

      const matches = await bcrypt.compare(currentPassword, users[index].password);
      if (!matches) {
        return res.status(401).json({ error: 'Current password is invalid' });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = [...users];
    updated[index] = { ...updated[index], password: hashed };
    await saveUsers(updated);
    res.json({ username: updated[index].username, type: updated[index].type });
  } catch (error) {
    next(error);
  }
});

app.post('/auth/users/:username/password', ensureAdmin, async (req, res, next) => {
  const { username } = req.params;
  const { password } = req.body ?? {};
  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  try {
    const users = await loadUsers();
    const index = users.findIndex((entry) => entry.username === username);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const updated = [...users];
    updated[index] = { ...updated[index], password: hashed };
    await saveUsers(updated);
    res.json({ username: updated[index].username, type: updated[index].type });
  } catch (error) {
    next(error);
  }
});

app.delete('/auth/users/:username', ensureAdmin, async (req, res, next) => {
  const { username } = req.params;
  if (req.user?.username === username) {
    return res.status(400).json({ error: 'Admins cannot delete themselves' });
  }

  try {
    const users = await loadUsers();
    const exists = users.some((entry) => entry.username === username);
    if (!exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const remaining = users.filter((entry) => entry.username !== username);
    await saveUsers(remaining);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

async function loadUsers() {
  try {
    const file = await fs.readFile(userFilePath, 'utf8');
    const parsed = JSON.parse(file);
    if (!Array.isArray(parsed.users)) {
      return [];
    }

    return parsed.users
      .map(normalizeEntry)
      .filter((entry) => entry.username.length > 0 && entry.password.length > 0);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function saveUsers(entries) {
  const normalized = entries
    .map(normalizeEntry)
    .filter((entry) => entry.username.length > 0 && entry.password.length > 0);

  await fs.writeFile(userFilePath, JSON.stringify({ users: normalized }, null, 2));
}

async function ensureUserHasApiKey(entries, index) {
  const entry = entries[index];
  if (!entry) {
    return null;
  }

  if (entry.apiKey) {
    return entry;
  }

  const apiKey = await registerMucajeyKeyForUser(entry.username);
  const updated = [...entries];
  updated[index] = { ...entry, apiKey };
  await saveUsers(updated);
  return updated[index];
}

async function registerMucajeyKeyForUser(username) {
  if (!MUCAJEY_REGISTER_URL) {
    throw new Error('Missing mucajey API register URL configuration');
  }

  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error('Username is required to request an API key');
  }

  const payload = {
    appName: MUCAJEY_APP_NAME,
    deviceId: `${MUCAJEY_DEVICE_ID_PREFIX}:${trimmed}`,
  };

  if (MUCAJEY_APP_VERSION) {
    payload.appVersion = MUCAJEY_APP_VERSION;
  }
  if (MUCAJEY_PLATFORM) {
    payload.platform = MUCAJEY_PLATFORM;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (MUCAJEY_API_KEY_HEADER) {
    headers['X-API-Key'] = MUCAJEY_API_KEY_HEADER;
  }

  const response = await fetch(MUCAJEY_REGISTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  let parsedBody;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch (error) {
    throw new Error(`Invalid JSON returned from mucajey API: ${error.message}`);
  }

  if (!response.ok) {
    const detail = parsedBody?.error ?? parsedBody?.message ?? response.statusText;
    throw new Error(`Failed to register API key (${detail})`);
  }

  if (!parsedBody?.apiKey) {
    throw new Error('mucajey API did not return an apiKey');
  }

  console.info(`[mucajey-admin] Registered API key for ${trimmed}`);
  return parsedBody.apiKey;
}

async function setupApp() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: 'ssr' },
      appType: 'custom',
    });

    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const template = await fs.readFile(path.join(__dirname, '../index.html'), 'utf8');
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (error) {
        vite.ssrFixStacktrace(error);
        next(error);
      }
    });
  } else {
    const distDir = path.join(__dirname, '../dist');
    app.use(express.static(distDir));
    app.use((req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }
}

const PORT = process.env.PORT ?? 4173;

setupApp()
  .then(() =>
    app.listen(PORT, () => {
      console.log(`Admin frontend listening on port ${PORT}`);
    })
  )
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });