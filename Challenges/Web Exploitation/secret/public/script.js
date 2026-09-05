document.addEventListener('DOMContentLoaded', () => {
    const reviewsContent = document.getElementById('reviewsContent');
    const adminContent = document.getElementById('adminContent');
    const logoutButtons = document.querySelectorAll('#logout');
    
    // Check authentication on page load
    checkAuthentication();
    
    // Add authentication check for protected pages
    function checkAuthentication() {
        // Only check on protected pages
        if (window.location.pathname === '/index' || 
            window.location.pathname === '/admin' ||
            window.location.pathname === '/index.html' || 
            window.location.pathname === '/admin.html') {
            
            fetch('/api/auth-check', { 
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            })
            .then(response => {
                if (!response.ok) {
                    // If not authenticated, redirect to signin
                    window.location.replace('/signin');
                }
            })
            .catch(() => {
                // On error, redirect to signin
                window.location.replace('/signin');
            });
        }
    }
    
    // Improved logout functionality
    logoutButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.disabled = true;
            button.innerHTML = 'Logging out...';
            
            // Send request to logout endpoint
            fetch('/logout', { 
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            })
            .then(response => {
                if (response.ok) {
                    // Clear any page data from memory
                    if (reviewsContent) reviewsContent.innerHTML = '';
                    if (adminContent) adminContent.innerHTML = '';
                    
                    // Replace the current history entry and redirect
                    window.location.replace('/signin');
                } else {
                    console.error('Logout failed');
                    button.disabled = false;
                    button.innerHTML = 'Logout';
                }
            })
            .catch(error => {
                console.error('Logout error:', error);
                button.disabled = false;
                button.innerHTML = 'Logout';
                // Fallback - still try to redirect
                window.location.replace('/signin');
            });
        });
    });

    // Add event listener for page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // When returning to the tab, check authentication again
            checkAuthentication();
        }
    });

    // Load reviews for index page with improved error handling
    if (reviewsContent) {
        reviewsContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading reviews...</p></div>';
        
        fetch('/api/reviews', {
            credentials: 'same-origin',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to view reviews');
                } else {
                    throw new Error('Failed to load reviews');
                }
            }
            return response.json();
        })
        .then(reviews => {
            if (reviews.length === 0) {
                reviewsContent.innerHTML = '<div class="empty-state"><p>No reviews available at this time.</p></div>';
                return;
            }
            
            reviewsContent.innerHTML = '<div class="movie-grid">' + 
                reviews.map(review => `
                    <div class="movie-card">
                        <h3>${review.title}</h3>
                        <div class="rating">
                            <span class="stars">${getStars(review.rating)}</span>
                            <span class="rating-text">${review.rating}</span>
                        </div>
                    </div>
                `).join('') + '</div>';
        })
        .catch(error => {
            reviewsContent.innerHTML = `<div class="error-message"><p>${error.message}</p></div>`;
            
            // Only redirect for authentication issues
            if (error.message.includes('log in')) {
                setTimeout(() => {
                    window.location.replace('/signin');
                }, 1000);
            }
        });
    }

    // Load admin content with improved error handling
    if (adminContent) {
        adminContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading admin content...</p></div>';
        
        fetch('/api/flag', {
            credentials: 'same-origin',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('You need admin privileges to view this content');
                } else if (response.status === 401) {
                    throw new Error('Authentication required');
                } else {
                    throw new Error('Failed to load admin content');
                }
            }
            return response.json();
        })
        .then(data => {
            adminContent.innerHTML = `
                <h2>Admin Panel</h2>
                <div class="admin-flag">
                    <h3>Secret Flag</h3>
                    <div class="flag-container">${data.flag}</div>
                </div>
                <div class="admin-actions">
                    <h3>Admin Actions</h3>
                    <button class="action-button" disabled>Manage Users</button>
                    <button class="action-button" disabled>Edit Reviews</button>
                    <button class="action-button" disabled>System Settings</button>
                </div>
            `;
        })
        .catch(error => {
            // If authentication error, redirect to signin
            if (error.message.includes('Authentication required')) {
                window.location.replace('/signin');
                return;
            }
            
            adminContent.innerHTML = `
                <h2>Access Denied</h2>
                <div class="error-message">
                    <p>${error.message}</p>
                    <a href="/index" class="button">Back to Reviews</a>
                </div>
            `;
        });
    }
    
    // Helper function to convert rating to stars
    function getStars(rating) {
        const numericRating = parseFloat(rating);
        const fullStars = Math.floor(numericRating);
        const hasHalfStar = numericRating - fullStars >= 0.5;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '★'; // Full star
            } else if (i === fullStars && hasHalfStar) {
                stars += '☆'; // Half star (using empty star as placeholder)
            } else {
                stars += '☆'; // Empty star
            }
        }
        
        return stars;
    }
});