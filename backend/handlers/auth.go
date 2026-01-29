package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"github.com/zelleofn/rae-backend/middleware"
)

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type RegisterResponse struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Token string `json:"token"`
}

func RegisterUser(c *gin.Context) {
	var req RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

    db := c.MustGet("db").(*sql.DB)

	var userID int64
	err = db.QueryRow(
		"INSERT INTO users (email, password_hash, subscription_tier) VALUES ($1, $2, $3) RETURNING id",
		req.Email,
		string(hashedPassword),
		"free",
	).Scan(&userID)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	token, err := middleware.GenerateToken(userID, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, RegisterResponse{
		ID:    userID,
		Email: req.Email,
		Token: token,
	})
}