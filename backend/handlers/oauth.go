package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zelleofn/rae-backend/middleware"
)


type OAuthRequest struct {
	Code        string `json:"code" binding:"required"`
	RedirectURI string `json:"redirect_uri" binding:"required"`
	DeviceID    string `json:"device_id"`
	Browser     string `json:"browser"`
	OS          string `json:"os"`
}

type OAuthResponse struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Token string `json:"token"`
}


type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
}

type googleUserInfo struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

func GoogleOAuth(c *gin.Context) {
	var req OAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokenResp, err := exchangeGoogleCode(req.Code, req.RedirectURI)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to exchange Google code: " + err.Error()})
		return
	}

	userInfo, err := getGoogleUserInfo(tokenResp.AccessToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get Google user info: " + err.Error()})
		return
	}

	db := c.MustGet("db").(*pgxpool.Pool)
	userID, email, err := findOrCreateOAuthUser(db, "google", userInfo.Sub, userInfo.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user: " + err.Error()})
		return
	}

	if req.DeviceID != "" {
		trackDevice(db, userID, req.DeviceID, req.Browser, req.OS)
	}

	token, err := middleware.GenerateToken(userID, email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, OAuthResponse{ID: userID, Email: email, Token: token})
}

func exchangeGoogleCode(code, redirectURI string) (*googleTokenResponse, error) {
	values := url.Values{
		"code":          {code},
		"client_id":     {os.Getenv("GOOGLE_CLIENT_ID")},
		"client_secret": {os.Getenv("GOOGLE_CLIENT_SECRET")},
		"redirect_uri":  {redirectURI},
		"grant_type":    {"authorization_code"},
	}

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", values)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google token error: %s", string(body))
	}

	var result googleTokenResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func getGoogleUserInfo(accessToken string) (*googleUserInfo, error) {
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google userinfo error: %s", string(body))
	}

	var info googleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, err
	}
	return &info, nil
}


type linkedInTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type linkedInProfile struct {
	ID        string `json:"id"`
	LocalizedFirstName string `json:"localizedFirstName"`
	LocalizedLastName  string `json:"localizedLastName"`
}

type linkedInEmailResponse struct {
	Elements []struct {
		Handle struct {
			EmailAddress string `json:"emailAddress"`
		} `json:"handle~"`
	} `json:"elements"`
}

func LinkedInOAuth(c *gin.Context) {
	var req OAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokenResp, err := exchangeLinkedInCode(req.Code, req.RedirectURI)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to exchange LinkedIn code: " + err.Error()})
		return
	}

	providerID, email, err := getLinkedInUserInfo(tokenResp.AccessToken)
if err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get LinkedIn user info: " + err.Error()})
    return
}

	db := c.MustGet("db").(*pgxpool.Pool)
	userID, userEmail, err := findOrCreateOAuthUser(db, "linkedin", providerID, email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user: " + err.Error()})
		return
	}

	if req.DeviceID != "" {
		trackDevice(db, userID, req.DeviceID, req.Browser, req.OS)
	}

	token, err := middleware.GenerateToken(userID, userEmail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, OAuthResponse{ID: userID, Email: userEmail, Token: token})
}

func exchangeLinkedInCode(code, redirectURI string) (*linkedInTokenResponse, error) {
	values := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
		"client_id":     {os.Getenv("LINKEDIN_CLIENT_ID")},
		"client_secret": {os.Getenv("LINKEDIN_CLIENT_SECRET")},
	}

	resp, err := http.Post(
		"https://www.linkedin.com/oauth/v2/accessToken",
		"application/x-www-form-urlencoded",
		strings.NewReader(values.Encode()),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("linkedin token error: %s", string(body))
	}

	var result linkedInTokenResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func getLinkedInUserInfo(accessToken string) (string, string, error) {
    req, _ := http.NewRequest("GET", "https://api.linkedin.com/v2/userinfo", nil)
    req.Header.Set("Authorization", "Bearer "+accessToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return "", "", err
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    if resp.StatusCode != http.StatusOK {
        return "", "", fmt.Errorf("linkedin userinfo error: %s", string(body))
    }

    var info struct {
        Sub   string `json:"sub"`
        Email string `json:"email"`
    }
    if err := json.Unmarshal(body, &info); err != nil {
        return "", "", err
    }
    return info.Sub, info.Email, nil
}


func findOrCreateOAuthUser(db *pgxpool.Pool, provider, providerID, email string) (int64, string, error) {
	ctx := context.Background()

	var userID int64
	err := db.QueryRow(ctx,
		`SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_id = $2`,
		provider, providerID,
	).Scan(&userID)
	if err == nil {
		var userEmail string
		db.QueryRow(ctx, `SELECT email FROM users WHERE id = $1`, userID).Scan(&userEmail)
		return userID, userEmail, nil
	}

	err = db.QueryRow(ctx,
		`SELECT id FROM users WHERE email = $1`, email,
	).Scan(&userID)

	if err != nil {
		err = db.QueryRow(ctx,
			`INSERT INTO users (email, subscription_tier) VALUES ($1, 'free') RETURNING id`,
			email,
		).Scan(&userID)
		if err != nil {
			return 0, "", fmt.Errorf("failed to create user: %w", err)
		}
	}

	_, err = db.Exec(ctx,
		`INSERT INTO oauth_accounts (user_id, provider, provider_id, email, created_at)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (provider, provider_id) DO NOTHING`,
		userID, provider, providerID, email, time.Now(),
	)
	if err != nil {
		return 0, "", fmt.Errorf("failed to link oauth account: %w", err)
	}

	return userID, email, nil
}

func trackDevice(db *pgxpool.Pool, userID int64, deviceID, browser, os string) {
	ctx := context.Background()
	now := time.Now()
	db.Exec(ctx,
		`INSERT INTO user_devices (user_id, device_id, browser, os, first_seen, last_seen)
		 VALUES ($1, $2, $3, $4, $5, $5)
		 ON CONFLICT (user_id, device_id) DO UPDATE SET last_seen = $5, browser = $3, os = $4`,
		userID, deviceID, browser, os, now,
	)
}