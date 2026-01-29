package middleware

import (
	"time"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID int64 `json:"user_id"`
	Email string `json:"email"`
	jwt.RegisteredClaims
}

func AuthMiddleware() gin.HandlerFunc {
    return func(c*gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
}

ports := strings.Split(authHeader, "")
if len(ports) !=2 || ports[0] != "Bearer" {
	c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header invalid"})
	c.Abort()
	return
}

tokenString := ports[1]

token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
	if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
		return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
	}
	return []byte(os.Getenv("JWT_SECRET")), nil
})

if err != nil {
    c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
    c.Abort()
    return
}

claims, ok := token.Claims.(*Claims)
if !ok || !token.Valid {
	c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid claims"})
	c.Abort()
	return
}

        c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)

		c.Next()
	}
}

func GenerateToken(userID int64, email string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}