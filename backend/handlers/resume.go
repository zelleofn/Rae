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

type ExperienceEntry struct {
	JobTitle    string `json:"jobTitle"`
	CompanyName string `json:"companyName"`
	Description string `json:"description"`
	StartMonth  string `json:"startMonth"`
	StartYear   string `json:"startYear"`
	EndMonth    string `json:"endMonth"`
	EndYear     string `json:"endYear"`
}

type ProjectEntry struct {
	ProjectName string `json:"projectName"`
	Description string `json:"description"`
	Link        string `json:"link"`
}

type EducationEntry struct {
	SchoolName   string `json:"schoolName"`
	FieldOfStudy string `json:"fieldOfStudy"`
	StartYear    string `json:"startYear"`
	EndYear      string `json:"endYear"`
}

type ParsedResume struct {
	FirstName           string            `json:"firstName"`
	LastName            string            `json:"lastName"`
	Email               string            `json:"email"`
	Phone               string            `json:"phone"`
	CountryCode         string            `json:"countryCode"`
	PhoneNumber         string            `json:"phoneNumber"`
	StreetAddress       string            `json:"streetAddress"`
	City                string            `json:"city"`
	ZipCode             string            `json:"zipCode"`
	State               string            `json:"state"`
	Location            string            `json:"location"`
	Country             string            `json:"country"`
	ProfessionalSummary string            `json:"professionalSummary"`
	Skills              []string          `json:"skills"`
	Github              string            `json:"github"`
	Linkedin            string            `json:"linkedin"`
	Portfolio           string            `json:"portfolio"`
	Availability        string            `json:"availability"`
	Languages           []struct {
		Language string `json:"language"`
		Level    string `json:"level"`
	} `json:"languages"`
	SalaryAmount   string            `json:"salaryAmount"`
	SalaryCurrency string            `json:"salaryCurrency"`
	SalaryType     string            `json:"salaryType"`
	Gender         string            `json:"gender"`
	Ethnicity      string            `json:"ethnicity"`
	Veteran        string            `json:"veteran"`
	Disability     string            `json:"disability"`
	EmploymentType string            `json:"employmentType"`
	Experience     []ExperienceEntry `json:"experience"`
	Projects       []ProjectEntry    `json:"projects"`
	Education      []EducationEntry  `json:"education"`
}

type ResumeUploadRequest struct {
	FileName   string       `json:"file_name" binding:"required"`
	RawText    string       `json:"raw_text" binding:"required"`
	ParsedData ParsedResume `json:"parsed_data" binding:"required"`
	FileData   string       `json:"file_data" binding:"required"`
}

type UpdateParsedDataRequest struct {
	ParsedData ParsedResume `json:"parsed_data" binding:"required"`
}

type ResumeUploadResponse struct {
    ID       int64  `json:"id"`
    FileName string `json:"file_name"`
    Message  string `json:"message"`
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

	
	fileBytes, err := base64.StdEncoding.DecodeString(req.FileData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file data encoding"})
		return
	}

	var resumeID int64
	err = db.QueryRow(context.Background(),
		"INSERT INTO resumes (user_id, file_name, raw_text, parsed_data, file_data) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		userID,
		req.FileName,
		req.RawText,
		req.ParsedData,
		fileBytes,
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
		"id":          resumeID,
		"file_name":   fileName,
		"raw_text":    rawText,
		"parsed_data": json.RawMessage(parsedData),
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

	resumes := []map[string]interface{}{}
	for rows.Next() {
		var id int64
		var fileName string
		var uploadedAt time.Time

		if err := rows.Scan(&id, &fileName, &uploadedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan error"})
			return
		}

		resumes = append(resumes, map[string]interface{}{
			"id":          id,
			"file_name":   fileName,
			"uploaded_at": uploadedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{"resumes": resumes})
}


func CheckUserResume(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	db := c.MustGet("db").(*pgxpool.Pool)

	var resumeID int64
	var fileName string
	err := db.QueryRow(context.Background(),
		"SELECT id, file_name FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1",
		userID,
	).Scan(&resumeID, &fileName)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"has_resume": false})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"has_resume": true,
		"id":         resumeID,
		"file_name":  fileName,
	})
}


func ViewResume(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	db := c.MustGet("db").(*pgxpool.Pool)

	var fileName string
	var fileData []byte

	err := db.QueryRow(context.Background(),
		"SELECT file_name, file_data FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1",
		userID,
	).Scan(&fileName, &fileData)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
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


func UpdateParsedData(c *gin.Context) {
	var req UpdateParsedDataRequest
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
		"UPDATE resumes SET parsed_data = $1 WHERE user_id = $2",
		req.ParsedData,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update parsed data"})
		return
	}

	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Parsed data updated successfully",
	})
}


func UpdateResume(c *gin.Context) {
	resumeID := c.Param("id")

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

	
	fileBytes, err := base64.StdEncoding.DecodeString(req.FileData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file data encoding"})
		return
	}

	result, err := db.Exec(context.Background(),
		"UPDATE resumes SET file_name = $1, raw_text = $2, parsed_data = $3, file_data = $4 WHERE id = $5 AND user_id = $6",
		req.FileName,
		req.RawText,
		req.ParsedData,
		fileBytes,
		resumeID,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update resume"})
		return
	}

	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Resume updated successfully",
	})
}