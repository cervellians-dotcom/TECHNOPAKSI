// Client-side auth helpers
(function(){
  const TOKEN_KEY = 'token';
  const USER_KEY = 'user';

  async function appRegister(fullname, email, username, password) {
    try {
      const response = await apiCall(config.api.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          fullname: fullname,
          email: email,
          username: username,
          password: password
        }
      });
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      throw err;
    }
  }

  async function appLogin(username, password) {
    try {
      const response = await apiCall(config.api.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          username: username,
          password: password
        }
      });

      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    location.href = '/login.html';
  }

  function requireAuth(redirectTo = '/login.html') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      const h = location.pathname + location.search + location.hash;
      sessionStorage.setItem('requested', h);
      location.href = redirectTo;
      return false;
    }
    return true;
  }

  function requireAdmin(redirectTo = '/index.html') {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
    if (user.role !== 'admin') {
      location.href = redirectTo;
      return false;
    }
    return true;
  }

  function currentUser() {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  }

  function getUserPoints() {
    const user = currentUser();
    return user ? user.points : 0;
  }

  async function addPoints(amount) {
    try {
      const user = await apiCall(config.api.profile);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user.points;
    } catch (err) {
      console.error('Error updating points:', err);
      return false;
    }
  }

  // Expose to window
  window.appRegister = appRegister;
  window.appLogin = appLogin;
  window.appLogout = logout;
  window.requireAuth = requireAuth;
  window.requireAdmin = requireAdmin;
  window.currentUser = currentUser;
  window.getUserPoints = getUserPoints;
  window.addPoints = addPoints;
})();