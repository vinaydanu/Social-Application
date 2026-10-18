const express = require('express');
const dbHelper = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const validator = require('validator');

const router = express.Router();

/**
 * GET /api/posts
 * Fetch recent posts for the community feed
 */
router.get('/', (req, res) => {
  try {
    const posts = dbHelper.getAllPosts();
    return res.status(200).json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('Fetch posts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve posts.'
    });
  }
});

/**
 * POST /api/posts
 * Publish a new post to the community feed (Requires authenticated session)
 */
router.post('/', requireAuth, (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot be empty.'
      });
    }

    if (content.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Post cannot exceed 500 characters.'
      });
    }

    const sanitizedContent = validator.escape(content.trim());
    const newPost = dbHelper.createPost(req.session.userId, sanitizedContent);
    const user = dbHelper.findUserById(req.session.userId);

    return res.status(201).json({
      success: true,
      message: 'Post published to ConnectSphere feed!',
      post: {
        id: newPost.id,
        content: newPost.content,
        created_at: new Date().toISOString(),
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        avatar_color: user.avatar_color
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to publish post.'
    });
  }
});

module.exports = router;
