"""
Test script for CTF Difficulty Calculator API
Run with: python test_api.py
"""

import requests
import json

API_URL = "http://localhost:5000"

def test_health():
    """Test health endpoint"""
    print("Testing /health endpoint...")
    response = requests.get(f"{API_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_calculate(test_name, data, expected_category=None):
    """Test calculate endpoint"""
    print(f"Testing: {test_name}")
    print(f"Input: {data}")
    
    response = requests.post(
        f"{API_URL}/calculate",
        headers={"Content-Type": "application/json"},
        data=json.dumps(data)
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    
    if expected_category and result.get('category') == expected_category:
        print(f"✓ Category matches expected: {expected_category}")
    
    print()
    return result

def run_tests():
    """Run all tests"""
    print("=" * 60)
    print("CTF Difficulty Calculator API Tests")
    print("=" * 60)
    print()
    
    # Test 1: Health check
    try:
        test_health()
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        print("Make sure the backend is running on http://localhost:5000")
        return
    
    # Test 2: All zeros (minimum)
    test_calculate(
        "All Zeros (Minimum)",
        {
            "knowledge": 0,
            "steps": 0,
            "tools": 0,
            "research": 0,
            "trickiness": 0
        },
        expected_category="Easy"
    )
    
    # Test 3: All maximum
    test_calculate(
        "All Maximum",
        {
            "knowledge": 5,
            "steps": 5,
            "tools": 5,
            "research": 5,
            "trickiness": 5
        },
        expected_category="Hard"
    )
    
    # Test 4: Beginner challenge
    test_calculate(
        "Beginner Challenge",
        {
            "knowledge": 1,
            "steps": 1,
            "tools": 0,
            "research": 0,
            "trickiness": 0
        },
        expected_category="Easy"
    )
    
    # Test 5: Intermediate challenge
    test_calculate(
        "Intermediate Challenge",
        {
            "knowledge": 3,
            "steps": 2,
            "tools": 2,
            "research": 2,
            "trickiness": 1
        },
        expected_category="Medium"
    )
    
    # Test 6: Expert challenge
    test_calculate(
        "Expert Challenge",
        {
            "knowledge": 5,
            "steps": 4,
            "tools": 4,
            "research": 4,
            "trickiness": 3
        },
        expected_category="Hard"
    )
    
    # Test 7: Boundary test (Easy/Medium)
    test_calculate(
        "Boundary: Easy/Medium (NS ≈ 0.33)",
        {
            "knowledge": 2,
            "steps": 2,
            "tools": 1,
            "research": 1,
            "trickiness": 1
        }
    )
    
    # Test 8: Boundary test (Medium/Hard)
    test_calculate(
        "Boundary: Medium/Hard (NS ≈ 0.67)",
        {
            "knowledge": 4,
            "steps": 3,
            "tools": 3,
            "research": 3,
            "trickiness": 2
        }
    )
    
    # Test 9: Invalid input (missing field)
    print("Testing: Invalid Input (Missing Field)")
    try:
        response = requests.post(
            f"{API_URL}/calculate",
            headers={"Content-Type": "application/json"},
            data=json.dumps({"knowledge": 3, "steps": 2})
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        if response.status_code == 400:
            print("✓ Correctly rejected invalid input")
    except Exception as e:
        print(f"Error: {e}")
    print()
    
    # Test 10: Values outside range (should be clamped)
    test_calculate(
        "Out of Range Values (Should Clamp)",
        {
            "knowledge": 10,
            "steps": -5,
            "tools": 3,
            "research": 2,
            "trickiness": 1
        }
    )
    
    print("=" * 60)
    print("Tests Complete!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
