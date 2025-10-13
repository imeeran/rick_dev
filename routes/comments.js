const express = require('express');
const { query } = require('../database/connection');
const router = express.Router();

// GET /api/comments - Get all comments with user and post information
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.id, 
        c.content, 
        c.created_at, 
        c.updated_at,
        u.username as author_username,
        u.email as author_email,
        p.title as post_title
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      JOIN posts p ON c.post_id = p.id 
      ORDER BY c.created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      message: error.message,
    });
  }
});

// GET /api/comments/:id - Get comment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT 
        c.id, 
        c.content, 
        c.created_at, 
        c.updated_at,
        u.username as author_username,
        u.email as author_email,
        p.title as post_title
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      JOIN posts p ON c.post_id = p.id 
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comment',
      message: error.message,
    });
  }
});

// POST /api/comments - Create new comment
router.post('/', async (req, res) => {
  try {
    const { content, post_id, user_id } = req.body;

    // Basic validation
    if (!content || !post_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Content, post_id, and user_id are required',
      });
    }

    // Verify post exists
    const postCheck = await query('SELECT id FROM posts WHERE id = $1', [post_id]);
    if (postCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post',
        message: 'Post does not exist',
      });
    }

    // Verify user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user',
        message: 'User does not exist',
      });
    }

    const result = await query(
      'INSERT INTO comments (content, post_id, user_id) VALUES ($1, $2, $3) RETURNING id, content, post_id, user_id, created_at',
      [content, post_id, user_id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Comment created successfully',
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      message: error.message,
    });
  }
});

// PUT /api/comments/:id - Update comment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'No content provided',
        message: 'Content is required to update comment',
      });
    }

    const result = await query(
      'UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, content, post_id, user_id, updated_at',
      [content, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Comment updated successfully',
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update comment',
      message: error.message,
    });
  }
});

// DELETE /api/comments/:id - Delete comment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM comments WHERE id = $1 RETURNING id, content', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment',
      message: error.message,
    });
  }
});

// GET /api/comments/post/:post_id - Get comments by post
router.get('/post/:post_id', async (req, res) => {
  try {
    const { post_id } = req.params;
    const result = await query(`
      SELECT 
        c.id, 
        c.content, 
        c.created_at, 
        c.updated_at,
        u.username as author_username,
        u.email as author_email
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.post_id = $1 
      ORDER BY c.created_at ASC
    `, [post_id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching post comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post comments',
      message: error.message,
    });
  }
});

// GET /api/comments/user/:user_id - Get comments by user
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await query(`
      SELECT 
        c.id, 
        c.content, 
        c.created_at, 
        c.updated_at,
        p.title as post_title
      FROM comments c 
      JOIN posts p ON c.post_id = p.id 
      WHERE c.user_id = $1 
      ORDER BY c.created_at DESC
    `, [user_id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching user comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user comments',
      message: error.message,
    });
  }
});

module.exports = router;
