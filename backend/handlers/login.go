package handlers

import (
    "context"
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
    "golang.org/x/crypto/bcrypt"
    "github.com/zelleofn/rae-backend/middleware"
)

type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
    ID    int64  `json:"id"`
    Email string `json:"email"`
    Token string `json:"token"`
}

func LoginUser(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    db := c.MustGet("db").(*pgxpool.Pool)

    var userID int64
    var passwordHash string
    err := db.QueryRow(context.Background(),
        "SELECT id, password_hash FROM users WHERE email = $1",
        req.Email,
    ).Scan(&userID, &passwordHash)

    if err != nil {
        if err.Error() == "no rows in result set" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
        return
    }

    if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)) != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
        return
    }

    token, err := middleware.GenerateToken(userID, req.Email)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
        return
    }

    c.JSON(http.StatusOK, LoginResponse{
        ID:    userID,
        Email: req.Email,
        Token: token,
    })
}
