const express = require('express');
const { query } = require('../database/connection');
const router = express.Router();

// GET /api/posts - Get all posts with user information
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.id, 
        p.title, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.username as author_username,
        u.email as author_email
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts',
      message: error.message,
    });
  }
});

// GET /api/posts/:id - Get post by ID with user information
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT 
        p.id, 
        p.title, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.username as author_username,
        u.email as author_email
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post',
      message: error.message,
    });
  }
});

// POST /api/posts - Create new post
router.post('/', async (req, res) => {
  try {
    const { title, content, user_id } = req.body;

    // Basic validation
    if (!title || !content || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title, content, and user_id are required',
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
      'INSERT INTO posts (title, content, user_id) VALUES ($1, $2, $3) RETURNING id, title, content, user_id, created_at',
      [title, content, user_id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error.message,
    });
  }
});

// PUT /api/posts/:id - Update post
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title && !content) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
        message: 'Provide at least one field to update',
      });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (title) {
      updateFields.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }

    if (content) {
      updateFields.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE posts SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, title, content, user_id, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post',
      message: error.message,
    });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM posts WHERE id = $1 RETURNING id, title', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post',
      message: error.message,
    });
  }
});

// GET /api/posts/user/:user_id - Get posts by user
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await query(`
      SELECT 
        p.id, 
        p.title, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.username as author_username
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.user_id = $1 
      ORDER BY p.created_at DESC
    `, [user_id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user posts',
      message: error.message,
    });
  }
});

module.exports = router;
