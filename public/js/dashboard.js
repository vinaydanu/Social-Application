/**
 * ConnectSphere - Member Dashboard & Social Feed Script
 */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check active session on load
  await checkSession();

  // Load community feed
  await loadPosts();

  // Wire create post interactions
  setupPostCreation();

  // Wire logout triggers
  setupLogout();
});

/**
 * Verify current session with backend
 */
async function checkSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();

    if (!res.ok || !data.authenticated || !data.user) {
      window.location.href = '/?error=unauthorized';
      return;
    }

    currentUser = data.user;
    renderUserProfile(currentUser);
  } catch (err) {
    console.error('Session check error:', err);
    window.location.href = '/?error=unauthorized';
  }
}

/**
 * Populate UI with authenticated user data
 */
function renderUserProfile(user) {
  const initial = user.firstName.charAt(0).toUpperCase();

  // Top Nav User
  const navAvatar = document.getElementById('navAvatar');
  const navUserName = document.getElementById('navUserName');
  if (navAvatar) {
    navAvatar.textContent = initial;
    navAvatar.style.backgroundColor = user.avatarColor || '#1877f2';
  }
  if (navUserName) {
    navUserName.textContent = user.firstName;
  }

  // Sidebar Profile Card
  const profileAvatar = document.getElementById('profileAvatar');
  const profileFullName = document.getElementById('profileFullName');
  const profileUsername = document.getElementById('profileUsername');
  const profileEmail = document.getElementById('profileEmail');
  const profileCreated = document.getElementById('profileCreated');
  const profileLastLogin = document.getElementById('profileLastLogin');

  if (profileAvatar) {
    profileAvatar.textContent = initial;
    profileAvatar.style.backgroundColor = user.avatarColor || '#1877f2';
  }
  if (profileFullName) {
    profileFullName.textContent = `${user.firstName} ${user.lastName}`;
  }
  if (profileUsername) {
    profileUsername.textContent = `@${user.username}`;
  }
  if (profileEmail) {
    profileEmail.textContent = user.email;
  }
  if (profileCreated && user.createdAt) {
    profileCreated.textContent = new Date(user.createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  if (profileLastLogin && user.lastLoginAt) {
    profileLastLogin.textContent = new Date(user.lastLoginAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Post Box Avatar
  const postBoxAvatar = document.getElementById('postBoxAvatar');
  if (postBoxAvatar) {
    postBoxAvatar.textContent = initial;
    postBoxAvatar.style.backgroundColor = user.avatarColor || '#1877f2';
  }
}

/**
 * Setup Post Creation Textarea & Submit
 */
function setupPostCreation() {
  const textarea = document.getElementById('postInput');
  const charCount = document.getElementById('charCount');
  const publishBtn = document.getElementById('publishPostBtn');

  if (!textarea || !publishBtn) return;

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    if (charCount) charCount.textContent = len;
  });

  publishBtn.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) return;

    publishBtn.disabled = true;
    publishBtn.textContent = 'Posting...';

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        textarea.value = '';
        if (charCount) charCount.textContent = '0';
        prependPostCard(data.post);
      } else {
        alert(data.message || 'Could not publish post.');
      }
    } catch (err) {
      console.error('Publish error:', err);
      alert('Unable to publish post. Please check your network.');
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Post';
    }
  });
}

/**
 * Fetch and render all community posts
 */
async function loadPosts() {
  const container = document.getElementById('postsFeedContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/posts');
    const data = await res.json();

    if (res.ok && data.posts) {
      container.innerHTML = '';
      if (data.posts.length === 0) {
        container.innerHTML = `
          <div class="post-card" style="text-align: center; color: var(--text-secondary); padding: 30px;">
            No posts yet! Be the first to share something on ConnectSphere.
          </div>
        `;
        return;
      }

      data.posts.forEach((post) => {
        container.appendChild(createPostCardElement(post));
      });
    }
  } catch (err) {
    console.error('Failed to load posts:', err);
    container.innerHTML = `
      <div class="post-card" style="text-align: center; color: var(--error-red); padding: 20px;">
        Failed to load feed posts. Please refresh the page.
      </div>
    `;
  }
}

/**
 * Helper to build post card DOM node
 */
function createPostCardElement(post) {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.id = `post-${post.id}`;

  const initial = (post.first_name || 'U').charAt(0).toUpperCase();
  const timeFormatted = formatTimeAgo(new Date(post.created_at));

  card.innerHTML = `
    <div class="post-header">
      <div class="avatar-circle" style="background-color: ${post.avatar_color || '#1877f2'};">
        ${initial}
      </div>
      <div>
        <div class="post-author-name">${escapeHtml(post.first_name)} ${escapeHtml(post.last_name)}</div>
        <div class="post-timestamp">@${escapeHtml(post.username)} &bull; ${timeFormatted}</div>
      </div>
    </div>
    <div class="post-body">
      ${escapeHtml(post.content)}
    </div>
    <div class="post-actions-bar">
      <button type="button" class="post-action-btn like-btn">
        <span>👍</span> <span>Like</span>
      </button>
      <button type="button" class="post-action-btn comment-btn">
        <span>💬</span> <span>Comment</span>
      </button>
      <button type="button" class="post-action-btn share-btn">
        <span>↗️</span> <span>Share</span>
      </button>
    </div>
  `;

  // Wire interactive like button
  const likeBtn = card.querySelector('.like-btn');
  likeBtn.addEventListener('click', () => {
    const isLiked = likeBtn.classList.toggle('liked');
    const label = likeBtn.querySelector('span:last-child');
    label.textContent = isLiked ? 'Liked' : 'Like';
  });

  // Wire mock comment
  const commentBtn = card.querySelector('.comment-btn');
  commentBtn.addEventListener('click', () => {
    const comment = prompt('Write a comment:');
    if (comment && comment.trim()) {
      alert(`Comment received: "${comment.trim()}"`);
    }
  });

  return card;
}

/**
 * Prepend post to feed
 */
function prependPostCard(post) {
  const container = document.getElementById('postsFeedContainer');
  if (!container) return;
  const newCard = createPostCardElement(post);
  container.prepend(newCard);
}

/**
 * Format relative timestamps
 */
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * HTML Escaper to prevent XSS in DOM rendering
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Setup Logout Button
 */
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  const footerLogout = document.getElementById('footerLogoutLink');

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/';
    }
  };

  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (footerLogout) footerLogout.addEventListener('click', handleLogout);
}
