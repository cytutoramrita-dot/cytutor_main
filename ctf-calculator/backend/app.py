from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Metric weights
WEIGHTS = {
    'knowledge': 2.5,
    'steps': 1.5,
    'tools': 1.3,
    'research': 1.5,
    'trickiness': 0.7
}

# Theoretical maximum difficulty score
DS_MAX = 37.5

def clamp(value, min_val=0, max_val=5):
    """Clamp value between min and max"""
    return max(min_val, min(max_val, value))

def round_to_nearest_5(value):
    """Round to nearest 5"""
    return round(value / 5) * 5

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['knowledge', 'steps', 'tools', 'research', 'trickiness']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        # Extract and clamp values
        knowledge = clamp(float(data['knowledge']))
        steps = clamp(float(data['steps']))
        tools = clamp(float(data['tools']))
        research = clamp(float(data['research']))
        trickiness = clamp(float(data['trickiness']))
        
        # Calculate Difficulty Score (DS)
        ds = (
            WEIGHTS['knowledge'] * knowledge +
            WEIGHTS['steps'] * steps +
            WEIGHTS['tools'] * tools +
            WEIGHTS['research'] * research +
            WEIGHTS['trickiness'] * trickiness
        )
        
        # Calculate Normalized Score (NS)
        ns = ds / DS_MAX
        ns = max(0, min(1, ns))  # Clamp between 0 and 1
        
        # Assign Category
        if ns <= 0.33:
            category = 'Easy'
        elif ns <= 0.66:
            category = 'Medium'
        else:
            category = 'Hard'
        
        # Calculate Points
        points_raw = 10 + (ns * 90)
        points = round_to_nearest_5(points_raw)
        
        # Ensure points are within bounds
        points = max(10, min(100, points))
        
        return jsonify({
            'difficulty_score': round(ds, 2),
            'normalized_score': round(ns, 2),
            'category': category,
            'points': points
        })
    
    except ValueError:
        return jsonify({'error': 'Invalid numeric values'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
