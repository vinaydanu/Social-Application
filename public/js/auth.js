/**
 * ConnectSphere - Client Authentication & UI Handling
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check URL query parameters for redirects
  const urlParams = new URLSearchParams(window.location.search);
  const loginAlert = document.getElementById('loginAlert');
  if (urlParams.get('error') === 'unauthorized' && loginAlert) {
    showAlert(loginAlert, 'Please sign in to access your dashboard.', 'error');
  } else if (urlParams.get('registered') === 'true' && loginAlert) {
    showAlert(loginAlert, 'Account created! Please sign in with your credentials.', 'success');
  }

  // Populate date select pickers
  populateDateSelectors('regBirthDay', 'regBirthYear');
  populateDateSelectors('sBirthDay', 'sBirthYear');

  // Wire password visibility toggles
  setupPasswordToggle('toggleLoginPasswordBtn', 'loginPassword');
  setupPasswordToggle('toggleRegPasswordBtn', 'regPassword');
  setupPasswordToggle('sTogglePasswordBtn', 'sRegPassword');

  // Wire password strength meters
  setupPasswordMeter('regPassword', 'regPasswordStrength', 'regPasswordHint');
  setupPasswordMeter('sRegPassword', 'sPasswordStrength', 'sPasswordHint');

  // Quick-fill demo credentials
  const quickFillBtn = document.getElementById('quickFillBtn');
  if (quickFillBtn) {
    quickFillBtn.addEventListener('click', () => {
      const idInput = document.getElementById('loginIdentifier');
      const passInput = document.getElementById('loginPassword');
      if (idInput && passInput) {
        idInput.value = 'alex@example.com';
        passInput.value = 'Password123!';
        idInput.focus();
      }
    });
  }

  // Wire Registration Modal
  const modal = document.getElementById('registerModal');
  const openModalBtn = document.getElementById('openRegisterModalBtn');
  const closeModalBtn = document.getElementById('closeRegisterModalBtn');

  if (openModalBtn && modal) {
    openModalBtn.addEventListener('click', () => {
      modal.classList.add('open');
      const firstInput = document.getElementById('regFirstName');
      if (firstInput) firstInput.focus();
    });
  }

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.remove('open');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  }

  // Handle Login Form Submit
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('loginIdentifier').value.trim();
      const password = document.getElementById('loginPassword').value;
      const submitBtn = document.getElementById('loginSubmitBtn');

      if (!identifier || !password) {
        showAlert(loginAlert, 'Please enter both your email/username and password.', 'error');
        return;
      }

      setLoadingState(submitBtn, true, 'Logging In...');

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showAlert(loginAlert, data.message || 'Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = data.redirectUrl || '/dashboard.html';
          }, 400);
        } else {
          showAlert(loginAlert, data.message || 'Invalid email or password.', 'error');
          setLoadingState(submitBtn, false, 'Log In');
        }
      } catch (err) {
        console.error('Login error:', err);
        showAlert(loginAlert, 'Unable to connect to server. Please try again.', 'error');
        setLoadingState(submitBtn, false, 'Log In');
      }
    });
  }

  // Handle Modal Registration Form Submit
  const regForm = document.getElementById('registerForm');
  const regAlert = document.getElementById('registerAlert');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleRegistrationSubmit({
        firstName: document.getElementById('regFirstName').value,
        lastName: document.getElementById('regLastName').value,
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        birthDay: document.getElementById('regBirthDay').value,
        birthMonth: document.getElementById('regBirthMonth').value,
        birthYear: document.getElementById('regBirthYear').value,
        gender: document.querySelector('input[name="gender"]:checked')?.value || 'Not specified',
        submitBtn: document.getElementById('regSubmitBtn'),
        alertElem: regAlert,
        defaultBtnText: 'Sign Up'
      });
    });
  }

  // Handle Standalone Page Registration Form Submit
  const sRegForm = document.getElementById('standaloneRegisterForm');
  const sRegAlert = document.getElementById('standaloneAlert');
  if (sRegForm) {
    sRegForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleRegistrationSubmit({
        firstName: document.getElementById('sRegFirstName').value,
        lastName: document.getElementById('sRegLastName').value,
        username: document.getElementById('sRegUsername').value,
        email: document.getElementById('sRegEmail').value,
        password: document.getElementById('sRegPassword').value,
        birthDay: document.getElementById('sBirthDay').value,
        birthMonth: document.getElementById('sBirthMonth').value,
        birthYear: document.getElementById('sBirthYear').value,
        gender: document.querySelector('input[name="standaloneGender"]:checked')?.value || 'Not specified',
        submitBtn: document.getElementById('sRegSubmitBtn'),
        alertElem: sRegAlert,
        defaultBtnText: 'Sign Up'
      });
    });
  }

  // Forgot password placeholder dialog
  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('In this demo educational project, password recovery is simulated. You can register a new account or log in with the test credentials provided below.');
    });
  }
});

/**
 * Handle Unified Registration API Request
 */
async function handleRegistrationSubmit(fields) {
  const { firstName, lastName, username, email, password, birthDay, birthMonth, birthYear, gender, submitBtn, alertElem, defaultBtnText } = fields;

  // Client validation
  if (!firstName.trim() || !lastName.trim()) {
    showAlert(alertElem, 'Please enter your first and last name.', 'error');
    return;
  }
  if (!username.trim() || username.trim().length < 3) {
    showAlert(alertElem, 'Username must be at least 3 characters.', 'error');
    return;
  }
  if (!email.trim() || !email.includes('@')) {
    showAlert(alertElem, 'Please provide a valid email address.', 'error');
    return;
  }
  if (!password || password.length < 8) {
    showAlert(alertElem, 'Password must be at least 8 characters long.', 'error');
    return;
  }

  setLoadingState(submitBtn, true, 'Creating Account...');

  const dateOfBirth = `${birthYear}-${birthMonth}-${birthDay.padStart(2, '0')}`;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        username,
        email,
        password,
        dateOfBirth,
        gender
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showAlert(alertElem, 'Account successfully created! Loading dashboard...', 'success');
      setTimeout(() => {
        window.location.href = data.redirectUrl || '/dashboard.html';
      }, 500);
    } else {
      showAlert(alertElem, data.message || 'Registration failed. Please check your details.', 'error');
      setLoadingState(submitBtn, false, defaultBtnText);
    }
  } catch (err) {
    console.error('Registration error:', err);
    showAlert(alertElem, 'Server error occurred during sign up. Please try again.', 'error');
    setLoadingState(submitBtn, false, defaultBtnText);
  }
}

/**
 * Helper: Populate Day and Year selects
 */
function populateDateSelectors(dayId, yearId) {
  const daySelect = document.getElementById(dayId);
  const yearSelect = document.getElementById(yearId);

  if (daySelect) {
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      opt.value = String(d);
      opt.textContent = String(d);
      if (d === 15) opt.selected = true;
      daySelect.appendChild(opt);
    }
  }

  if (yearSelect) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 13; y >= currentYear - 90; y--) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      if (y === 2000) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }
}

/**
 * Helper: Password visibility toggle
 */
function setupPasswordToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isPassword = input.getAttribute('type') === 'password';
    input.setAttribute('type', isPassword ? 'text' : 'password');
    btn.textContent = isPassword ? '🙈' : '👁️';
  });
}

/**
 * Helper: Password strength meter
 */
function setupPasswordMeter(inputId, meterId, hintId) {
  const input = document.getElementById(inputId);
  const meter = document.getElementById(meterId);
  const hint = document.getElementById(hintId);
  if (!input || !meter) return;

  input.addEventListener('input', () => {
    const val = input.value;
    let score = 0;
    if (val.length >= 8) score += 25;
    if (/[A-Z]/.test(val)) score += 25;
    if (/[0-9]/.test(val)) score += 25;
    if (/[^A-Za-z0-9]/.test(val)) score += 25;

    meter.style.width = `${score}%`;

    if (score <= 25) {
      meter.style.backgroundColor = '#fa3e3e'; // red
      if (hint) hint.textContent = 'Weak password (must be at least 8 chars).';
    } else if (score <= 50) {
      meter.style.backgroundColor = '#fd7e14'; // orange
      if (hint) hint.textContent = 'Medium password (add a number or uppercase letter).';
    } else if (score <= 75) {
      meter.style.backgroundColor = '#fadb14'; // yellow
      if (hint) hint.textContent = 'Good password (add a special symbol).';
    } else {
      meter.style.backgroundColor = '#42b72a'; // green
      if (hint) hint.textContent = 'Strong password!';
    }
  });
}

/**
 * Helper: Show alert banner
 */
function showAlert(elem, message, type = 'error') {
  if (!elem) return;
  elem.textContent = message;
  elem.className = `alert-box active alert-${type}`;
}

/**
 * Helper: Button loading state
 */
function setLoadingState(btn, isLoading, text) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = text;
  btn.style.opacity = isLoading ? '0.7' : '1';
  btn.style.cursor = isLoading ? 'not-allowed' : 'pointer';
}
