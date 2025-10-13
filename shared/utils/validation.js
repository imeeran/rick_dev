/**
 * Validation utilities for request data
 */

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const validateUsername = (username) => {
  // 3-20 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

const validateLength = (value, fieldName, minLength, maxLength) => {
  if (value && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`;
  }
  if (value && value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters long`;
  }
  return null;
};

const validateUser = (userData) => {
  const errors = [];

  // Required fields
  const usernameError = validateRequired(userData.username, 'Username');
  if (usernameError) errors.push(usernameError);

  const emailError = validateRequired(userData.email, 'Email');
  if (emailError) errors.push(emailError);

  const passwordError = validateRequired(userData.password, 'Password');
  if (passwordError) errors.push(passwordError);

  // Format validation
  if (userData.username && !validateUsername(userData.username)) {
    errors.push('Username must be 3-20 characters and contain only letters, numbers, and underscores');
  }

  if (userData.email && !validateEmail(userData.email)) {
    errors.push('Please provide a valid email address');
  }

  if (userData.password && !validatePassword(userData.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }

  // Length validation
  const titleLengthError = validateLength(userData.username, 'Username', 3, 20);
  if (titleLengthError) errors.push(titleLengthError);

  return errors;
};

const validatePost = (postData) => {
  const errors = [];

  const titleError = validateRequired(postData.title, 'Title');
  if (titleError) errors.push(titleError);

  const contentError = validateRequired(postData.content, 'Content');
  if (contentError) errors.push(contentError);

  const userIdError = validateRequired(postData.user_id, 'User ID');
  if (userIdError) errors.push(userIdError);

  const titleLengthError = validateLength(postData.title, 'Title', 1, 200);
  if (titleLengthError) errors.push(titleLengthError);

  return errors;
};

const validateComment = (commentData) => {
  const errors = [];

  const contentError = validateRequired(commentData.content, 'Content');
  if (contentError) errors.push(contentError);

  const postIdError = validateRequired(commentData.post_id, 'Post ID');
  if (postIdError) errors.push(postIdError);

  const userIdError = validateRequired(commentData.user_id, 'User ID');
  if (userIdError) errors.push(userIdError);

  return errors;
};

module.exports = {
  validateEmail,
  validatePassword,
  validateUsername,
  validateRequired,
  validateLength,
  validateUser,
  validatePost,
  validateComment,
};
