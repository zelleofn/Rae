package main

import (
    "context"
    "log"
    "os"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/zelleofn/rae-backend/handlers"
)

func main() {
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }

    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        log.Fatal("DATABASE_URL not set")
    }

    pool, err := pgxpool.New(context.Background(), dbURL)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    defer pool.Close()

    log.Println("Connected to database successfully")

    r := gin.Default()

  r.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"*"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Content-Type", "Authorization"},
    AllowCredentials: true,
}))

    r.Use(func(c *gin.Context) {
        c.Set("db", pool)
        c.Next()
    })

    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })

    r.POST("/api/auth/register", handlers.RegisterUser)
    r.POST("/api/auth/login", handlers.LoginUser)

    r.POST("/api/resume/upload", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "upload resume endpoint"})
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "3000"
    }

    log.Printf("Server is running on port %s", port)
    r.Run(":" + port)
}
