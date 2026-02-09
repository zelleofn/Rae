package handlers

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CVUploadRequest struct {
	FileName   string          `json:"file_name" binding:"required"`
	RawText    string          `json:"raw_text" binding:"required"`
	ParsedData json.RawMessage `json:"parsed_data" binding:"required"`
	FileData   string          `json:"file_data" binding:"required"` 
}

type UpdateCVParsedDataRequest struct {
	ParsedData json.RawMessage `json:"parsed_data" binding:"required"`
}

type CVUploadResponse struct {
	ID       int64  `json:"id"`
	FileName string `json:"file_name"`
	Message  string `json:"message"`
}

func UploadCV(c *gin.Context) {
	var req CVUploadRequest
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
		"DELETE FROM cvs WHERE user_id = $1",
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete old cv"})
		return
	}

	
	fileBytes, err := base64.StdEncoding.DecodeString(req.FileData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file data encoding"})
		return
	}

	var cvID int64
	err = db.QueryRow(context.Background(),
		"INSERT INTO cvs (user_id, file_name, raw_text, parsed_data, file_data) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		userID,
		req.FileName,
		req.RawText,
		req.ParsedData,
		fileBytes,
	).Scan(&cvID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store cv"})
		return
	}

	c.JSON(http.StatusCreated, CVUploadResponse{
		ID:       cvID,
		FileName: req.FileName,
		Message:  "CV uploaded successfully",
	})
}

func GetCV(c *gin.Context) {
	cvID := c.Param("id")

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
		"SELECT file_name, raw_text, parsed_data FROM cvs WHERE id = $1 AND user_id = $2",
		cvID,
		userID,
	).Scan(&fileName, &rawText, &parsedData)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          cvID,
		"file_name":   fileName,
		"raw_text":    rawText,
		"parsed_data": json.RawMessage(parsedData),
	})
}

func GetUserCVs(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	db := c.MustGet("db").(*pgxpool.Pool)

	rows, err := db.Query(context.Background(),
		"SELECT id, file_name, uploaded_at FROM cvs WHERE user_id = $1 ORDER BY uploaded_at DESC",
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer rows.Close()

	cvs := []map[string]interface{}{}
	for rows.Next() {
		var id int64
		var fileName string
		var uploadedAt time.Time

		if err := rows.Scan(&id, &fileName, &uploadedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan error"})
			return
		}

		cvs = append(cvs, map[string]interface{}{
			"id":          id,
			"file_name":   fileName,
			"uploaded_at": uploadedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{"cvs": cvs})
}

func CheckUserCV(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	db := c.MustGet("db").(*pgxpool.Pool)

	var cvID int64
	var fileName string
	err := db.QueryRow(context.Background(),
		"SELECT id, file_name FROM cvs WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1",
		userID,
	).Scan(&cvID, &fileName)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"has_cv": false})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"has_cv":    true,
		"id":        cvID,
		"file_name": fileName,
	})
}

func ViewCV(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	db := c.MustGet("db").(*pgxpool.Pool)

	var fileName string
	var fileData []byte

	err := db.QueryRow(context.Background(),
		"SELECT file_name, file_data FROM cvs WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1",
		userID,
	).Scan(&fileName, &fileData)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "inline; filename=\""+fileName+"\"")
	c.Data(http.StatusOK, "application/pdf", fileData)
}

func UpdateCVParsedData(c *gin.Context) {
	var req UpdateCVParsedDataRequest
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

	result, err := db.Exec(context.Background(),
		"UPDATE cvs SET parsed_data = $1 WHERE user_id = $2",
		req.ParsedData,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update cv parsed data"})
		return
	}

	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "CV parsed data updated successfully",
	})
}

func UpdateCV(c *gin.Context) {
	cvID := c.Param("id")

	var req CVUploadRequest
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

	fileBytes, err := base64.StdEncoding.DecodeString(req.FileData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file data encoding"})
		return
	}

	result, err := db.Exec(context.Background(),
		"UPDATE cvs SET file_name = $1, raw_text = $2, parsed_data = $3, file_data = $4 WHERE id = $5 AND user_id = $6",
		req.FileName,
		req.RawText,
		req.ParsedData,
		fileBytes,
		cvID,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update cv"})
		return
	}

	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "cv not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "CV updated successfully",
	})
}