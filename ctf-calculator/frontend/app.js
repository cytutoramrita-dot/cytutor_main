// API Configuration
const API_URL = 'http://localhost:5000';

// Particle background animation
function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 50;
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 2;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
            ctx.fill();
        }
    }
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Draw connections
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(34, 197, 94, ${0.1 * (1 - distance / 100)})`;
                    ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Check if all fields are selected
function areAllFieldsSelected() {
    const metrics = ['knowledge', 'steps', 'tools', 'research', 'trickiness'];
    return metrics.every(metric => {
        return document.querySelector(`input[name="${metric}"]:checked`) !== null;
    });
}

// Update value display
function updateValueDisplay(metric, value) {
    const valueElement = document.getElementById(`${metric}-value`);
    if (value !== null) {
        valueElement.textContent = value;
        valueElement.className = 'text-neon-green font-mono text-lg font-bold';
    } else {
        valueElement.textContent = '-';
        valueElement.className = 'text-gray-500 font-mono text-lg font-bold';
    }
}

// Show/hide incomplete message
function updateUIState() {
    const incompleteMessage = document.getElementById('incomplete-message');
    const resultsContainer = document.getElementById('results-container');
    
    if (areAllFieldsSelected()) {
        incompleteMessage.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
    } else {
        incompleteMessage.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
    }
}

// Calculate and update results
async function calculate() {
    // Check if all fields are selected
    if (!areAllFieldsSelected()) {
        updateUIState();
        return;
    }
    
    const knowledge = parseInt(document.querySelector('input[name="knowledge"]:checked').value);
    const steps = parseInt(document.querySelector('input[name="steps"]:checked').value);
    const tools = parseInt(document.querySelector('input[name="tools"]:checked').value);
    const research = parseInt(document.querySelector('input[name="research"]:checked').value);
    const trickiness = parseInt(document.querySelector('input[name="trickiness"]:checked').value);
    
    // Update value displays
    updateValueDisplay('knowledge', knowledge);
    updateValueDisplay('steps', steps);
    updateValueDisplay('tools', tools);
    updateValueDisplay('research', research);
    updateValueDisplay('trickiness', trickiness);
    
    // Show results container
    updateUIState();
    
    try {
        const response = await fetch(`${API_URL}/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                knowledge,
                steps,
                tools,
                research,
                trickiness
            })
        });
        
        if (!response.ok) {
            throw new Error('Calculation failed');
        }
        
        const result = await response.json();
        
        // Update results
        document.getElementById('difficulty-score').textContent = result.difficulty_score.toFixed(2);
        document.getElementById('normalized-score').textContent = result.normalized_score.toFixed(2);
        document.getElementById('points').textContent = result.points;
        
        // Update category with color
        const categoryElement = document.getElementById('category');
        categoryElement.textContent = result.category;
        
        // Update category styling
        categoryElement.className = 'inline-block px-6 py-3 rounded-lg text-xl font-bold';
        if (result.category === 'Easy') {
            categoryElement.className += ' bg-green-500/20 text-green-400 border-2 border-green-500/50';
        } else if (result.category === 'Medium') {
            categoryElement.className += ' bg-orange-500/20 text-orange-400 border-2 border-orange-500/50';
        } else {
            categoryElement.className += ' bg-red-500/20 text-red-400 border-2 border-red-500/50';
        }
        
    } catch (error) {
        console.error('Error calculating:', error);
        // Show error in UI
        document.getElementById('points').textContent = 'ERR';
        document.getElementById('category').textContent = 'Error';
    }
}

// Initialize radio buttons
function initRadioButtons() {
    const metrics = ['knowledge', 'steps', 'tools', 'research', 'trickiness'];
    
    metrics.forEach(metric => {
        const radioButtons = document.querySelectorAll(`input[name="${metric}"]`);
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                const value = parseInt(radio.value);
                updateValueDisplay(metric, value);
                calculate();
            });
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initRadioButtons();
    updateUIState(); // Show incomplete message initially
});
