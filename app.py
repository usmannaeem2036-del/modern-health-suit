import os
import sqlite3
from flask import Flask, render_template, request, jsonify
from groq import Groq  # Make sure to install: pip install groq flask flask-cors

app = Flask(__name__)

# Initialize Groq Client (Reads key from environment variables or put your key directly as a string)
# Best practice: Set environment variable GROQ_API_KEY
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
# ==========================================
# DATABASE INITIALIZATION (SQLite)
# ==========================================
def init_db():
    conn = sqlite3.connect('pulse_matrix.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT,
            patient_type TEXT,
            age INTEGER,
            bmi REAL,
            bmr REAL,
            tdee REAL,
            goal TEXT,
            ai_report TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Run database setup on startup
init_db()

# ==========================================
# ROUTES
# ==========================================

@app.route('/')
def index():
    # Renders your main frontend file (ensure it's inside a 'templates' folder named index.html)
    return render_template('index.html')

@app.route('/api/ai-advice', methods=['POST'])
def ai_advice():
    try:
        data = request.get_json()
        prompt_text = data.get('prompt')

        if not prompt_text:
            return jsonify({"error": "Prompt is required"}), 400

        # Call Groq API (using Llama-3 model)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional clinical nutritionist and fitness expert. Provide concise, structured markdown responses with clear bullet points."
                },
                {
                    "role": "user",
                    "content": prompt_text
                }
            ],
            model="openai/gpt-oss-120b",  # Or your preferred Groq model
            temperature=0.5,
            max_tokens=1000,
        )

        reply_content = chat_completion.choices[0].message.content

        return jsonify({"reply": reply_content})

    except Exception as e:
        print(f"Error communicating with Groq API: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/save-patient', methods=['POST'])
def save_patient():
    try:
        data = request.get_json()
        
        conn = sqlite3.connect('pulse_matrix.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO patient_history (patient_name, patient_type, age, bmi, bmr, tdee, goal, ai_report)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('name', 'Patient'),
            data.get('type', 'male'),
            data.get('age', 25),
            data.get('bmi', 0.0),
            data.get('bmr', 0.0),
            data.get('tdee', 0.0),
            data.get('goal', 'maintain'),
            data.get('report', '')
        ))
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Patient record saved successfully!"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/patients', methods=['GET'])
def get_patients():
    try:
        conn = sqlite3.connect('pulse_matrix.db')
        conn.row_factory = sqlite3.Row  # Returns rows as dictionaries
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patient_history ORDER BY created_at DESC LIMIT 20")
        rows = cursor.fetchall()
        conn.close()

        patients = [dict(row) for row in rows]
        return jsonify({"success": True, "data": patients})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)