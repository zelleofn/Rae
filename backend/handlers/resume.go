package handlers

import (
	"context"
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"encoding/json"
)

type ResumeUploadRequest struct {
	FileName   string          `json:"file_name" binding:"required"`
	RawText    string          `json:"raw_text" binding:"required"`
	ParsedData json.RawMessage `json:"parsed_data" binding:"required"`
}

type ResumeUploadResponse struct {
	ID        int64  `json:"id"`
	FileName  string `json:"file_name"`
	Message   string `json:"message"`
}

func UploadResume(c *gin.Context) {
	var req ResumeUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	db := c.MustGet("db").(*pgxpool.Pool)

	
	_, err := db.Exec(context.Background(),
		"DELETE FROM resumes WHERE user_id = $1",
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete old resume"})
		return
	}

	
	var resumeID int64
	err = db.QueryRow(context.Background(),
		"INSERT INTO resumes (user_id, file_name, raw_text, parsed_data) VALUES ($1, $2, $3, $4) RETURNING id",
		userID,
		req.FileName,
		req.RawText,
		req.ParsedData,
	).Scan(&resumeID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store resume"})
		return
	}

	c.JSON(http.StatusCreated, ResumeUploadResponse{
		ID:       resumeID,
		FileName: req.FileName,
		Message:  "Resume uploaded successfully",
	})
}

func GetResume(c *gin.Context) {
	resumeID := c.Param("id")

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	db := c.MustGet("db").(*pgxpool.Pool)

	var fileName string
	var rawText string
	var parsedData string

	err := db.QueryRow(context.Background(),
		"SELECT file_name, raw_text, parsed_data FROM resumes WHERE id = $1 AND user_id = $2",
		resumeID,
		userID,
	).Scan(&fileName, &rawText, &parsedData)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           resumeID,
		"file_name":    fileName,
		"raw_text":     rawText,
		"parsed_data":  json.RawMessage(parsedData),
	})
}
func GetUserResumes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	db := c.MustGet("db").(*pgxpool.Pool)

	rows, err := db.Query(context.Background(),
		"SELECT id, file_name, uploaded_at FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC",
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer rows.Close()

	var resumes []map[string]interface{}
	for rows.Next() {
		var id int64
		var fileName string
		var uploadedAt string

		if err := rows.Scan(&id, &fileName, &uploadedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan error"})
			return
		}

		resumes = append(resumes, map[string]interface{}{
			"id":          id,
			"file_name":   fileName,
			"uploaded_at": uploadedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"resumes": resumes})
}