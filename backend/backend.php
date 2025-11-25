<?php
// PHP Headless CMS Backend API with Admin Authentication
// Simple RESTful API for blog posts with SQLite database

// Enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers - allow requests from Next.js frontend
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
define('DB_FILE', __DIR__ . '/blog.db');
define('ADMIN_PASSWORD', getenv('ADMIN_PASSWORD')); // CHANGE THIS!
define('TOKEN_EXPIRY_HOURS', 24);

// Initialize database connection
function getDB() {
    try {
        $db = new PDO('sqlite:' . DB_FILE);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Create posts table if it doesn't exist
        $db->exec("
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        // Create admin_tokens table for authentication
        $db->exec("
            CREATE TABLE IF NOT EXISTS admin_tokens (
                token TEXT PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL
            )
        ");
        
        // Clean up expired tokens
        $db->exec("DELETE FROM admin_tokens WHERE expires_at < datetime('now')");
        
        return $db;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit();
    }
}

// Generate secure random token
function generateToken() {
    return bin2hex(random_bytes(32));
}

// Generate UUID v4
function generateUUID() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

// Verify admin token from Authorization header
function verifyAdminToken($db) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    
    if (!$authHeader) {
        http_response_code(401);
        echo json_encode(['error' => 'Authorization header required']);
        exit();
    }
    
    // Extract token from "Bearer <token>"
    $parts = explode(' ', $authHeader);
    if (count($parts) !== 2 || strtolower($parts[0]) !== 'bearer') {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid authorization header format']);
        exit();
    }
    
    $token = $parts[1];
    
    try {
        // Check if token exists and is not expired
        $stmt = $db->prepare("
            SELECT * FROM admin_tokens 
            WHERE token = :token AND expires_at > datetime('now')
        ");
        $stmt->execute(['token' => $token]);
        $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tokenData) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid or expired token']);
            exit();
        }
        
        return $token;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Token verification failed: ' . $e->getMessage()]);
        exit();
    }
}

// Parse request URI
function parseRequest() {
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    
    // Remove base path if present
    $uri = str_replace('/api', '', $uri);
    $uri = trim($uri, '/');
    $segments = explode('/', $uri);
    
    return [
        'method' => $method,
        'resource' => $segments[0] ?? '',
        'subresource' => $segments[1] ?? null,
        'id' => $segments[2] ?? $segments[1] ?? null
    ];
}

// Validate post data
function validatePostData($data, $isUpdate = false) {
    $errors = [];
    
    if (!$isUpdate) {
        if (empty($data['title'])) {
            $errors[] = 'Title is required';
        }
        if (empty($data['content'])) {
            $errors[] = 'Content is required';
        }
    } else {
        if (isset($data['title']) && empty($data['title'])) {
            $errors[] = 'Title cannot be empty';
        }
        if (isset($data['content']) && empty($data['content'])) {
            $errors[] = 'Content cannot be empty';
        }
        if (empty($data['title']) && empty($data['content'])) {
            $errors[] = 'At least one field (title or content) must be provided';
        }
    }
    
    return $errors;
}

// Authentication Endpoints

// POST /api/admin/login
function adminLogin($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Password is required']);
        return;
    }
    
    // Verify password
    if ($input['password'] !== ADMIN_PASSWORD) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid password']);
        return;
    }
    
    try {
        // Generate token
        $token = generateToken();
        $expiresAt = date('Y-m-d H:i:s', strtotime('+' . TOKEN_EXPIRY_HOURS . ' hours'));
        
        // Store token
        $stmt = $db->prepare("
            INSERT INTO admin_tokens (token, expires_at) 
            VALUES (:token, :expires_at)
        ");
        $stmt->execute([
            'token' => $token,
            'expires_at' => $expiresAt
        ]);
        
        echo json_encode([
            'success' => true,
            'token' => $token,
            'expires_at' => $expiresAt
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create session: ' . $e->getMessage()]);
    }
}

// GET /api/admin/verify
function adminVerify($db) {
    $token = verifyAdminToken($db);
    
    echo json_encode([
        'success' => true,
        'status' => 'valid',
        'message' => 'Token is valid'
    ]);
}

// POST /api/admin/logout
function adminLogout($db) {
    $token = verifyAdminToken($db);
    
    try {
        $stmt = $db->prepare("DELETE FROM admin_tokens WHERE token = :token");
        $stmt->execute(['token' => $token]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Logout failed: ' . $e->getMessage()]);
    }
}

// Post Endpoints

// GET all posts (public)
function getAllPosts($db) {
    try {
        $stmt = $db->query("SELECT * FROM posts ORDER BY created_at DESC");
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $posts,
            'count' => count($posts)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch posts: ' . $e->getMessage()]);
    }
}

// GET post by ID (public)
function getPostById($db, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Post ID is required']);
        return;
    }
    
    try {
        $stmt = $db->prepare("SELECT * FROM posts WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($post) {
            echo json_encode([
                'success' => true,
                'data' => $post
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Post not found']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch post: ' . $e->getMessage()]);
    }
}

// POST create new post (protected)
function createPost($db) {
    // Verify admin authentication
    verifyAdminToken($db);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    $errors = validatePostData($input);
    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode(['error' => 'Validation failed', 'errors' => $errors]);
        return;
    }
    
    try {
        $id = generateUUID();
        $stmt = $db->prepare("
            INSERT INTO posts (id, title, content, created_at, last_modified) 
            VALUES (:id, :title, :content, datetime('now'), datetime('now'))
        ");
        
        $stmt->execute([
            'id' => $id,
            'title' => $input['title'],
            'content' => $input['content']
        ]);
        
        // Fetch the created post
        $stmt = $db->prepare("SELECT * FROM posts WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Post created successfully',
            'data' => $post
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create post: ' . $e->getMessage()]);
    }
}

// PATCH update post (protected)
function updatePost($db, $id) {
    // Verify admin authentication
    verifyAdminToken($db);
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Post ID is required']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    $errors = validatePostData($input, true);
    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode(['error' => 'Validation failed', 'errors' => $errors]);
        return;
    }
    
    try {
        // Check if post exists
        $stmt = $db->prepare("SELECT * FROM posts WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$post) {
            http_response_code(404);
            echo json_encode(['error' => 'Post not found']);
            return;
        }
        
        // Build update query dynamically
        $updates = [];
        $params = ['id' => $id];
        
        if (isset($input['title'])) {
            $updates[] = "title = :title";
            $params['title'] = $input['title'];
        }
        
        if (isset($input['content'])) {
            $updates[] = "content = :content";
            $params['content'] = $input['content'];
        }
        
        $updates[] = "last_modified = datetime('now')";
        
        $sql = "UPDATE posts SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        // Fetch updated post
        $stmt = $db->prepare("SELECT * FROM posts WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Post updated successfully',
            'data' => $post
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update post: ' . $e->getMessage()]);
    }
}

// DELETE post (protected)
function deletePost($db, $id) {
    // Verify admin authentication
    verifyAdminToken($db);
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Post ID is required']);
        return;
    }
    
    try {
        // Check if post exists
        $stmt = $db->prepare("SELECT * FROM posts WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$post) {
            http_response_code(404);
            echo json_encode(['error' => 'Post not found']);
            return;
        }
        
        // Delete post
        $stmt = $db->prepare("DELETE FROM posts WHERE id = :id");
        $stmt->execute(['id' => $id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Post deleted successfully',
            'deleted_post' => $post
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete post: ' . $e->getMessage()]);
    }
}

// Main router
function route() {
    $db = getDB();
    $request = parseRequest();
    
    // Admin authentication routes
    if ($request['resource'] === 'admin') {
        switch ($request['subresource']) {
            case 'login':
                if ($request['method'] === 'POST') {
                    adminLogin($db);
                } else {
                    http_response_code(405);
                    echo json_encode(['error' => 'Method not allowed']);
                }
                return;
                
            case 'verify':
                if ($request['method'] === 'GET') {
                    adminVerify($db);
                } else {
                    http_response_code(405);
                    echo json_encode(['error' => 'Method not allowed']);
                }
                return;
                
            case 'logout':
                if ($request['method'] === 'POST') {
                    adminLogout($db);
                } else {
                    http_response_code(405);
                    echo json_encode(['error' => 'Method not allowed']);
                }
                return;
                
            default:
                http_response_code(404);
                echo json_encode(['error' => 'Admin endpoint not found']);
                return;
        }
    }
    
    // Posts routes
    if ($request['resource'] !== 'posts') {
        http_response_code(404);
        echo json_encode(['error' => 'Resource not found']);
        return;
    }
    
    switch ($request['method']) {
        case 'GET':
            if ($request['id']) {
                getPostById($db, $request['id']);
            } else {
                getAllPosts($db);
            }
            break;
            
        case 'POST':
            createPost($db);
            break;
            
        case 'PATCH':
            updatePost($db, $request['id']);
            break;
            
        case 'DELETE':
            deletePost($db, $request['id']);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
}

// Run the application
route();