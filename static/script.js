// ==========================================
// CONFIGURATION & INITIALIZATION
// ==========================================
let currentUnit = 'metric';
let selectedType = 'male';

// DOM Elements - Inputs
const patientNameInput = document.getElementById('patientName');
const heightInput = document.getElementById('heightInput');
const weightInput = document.getElementById('weightInput');
const ageInput = document.getElementById('ageInput');
const activityInput = document.getElementById('activityInput');
const goalInput = document.getElementById('goalInput');

// DOM Elements - Displays & Containers
const heightValueDisplay = document.getElementById('heightValueDisplay');
const weightValueDisplay = document.getElementById('weightValueDisplay');
const bmiScore = document.getElementById('bmiScore');
const bmiCategory = document.getElementById('bmiCategory');
const bmrScore = document.getElementById('bmrScore');
const tdeeScore = document.getElementById('tdeeScore');
const aiResponseContainer = document.getElementById('aiResponseContainer');
const ageErrorDisplay = document.getElementById('ageErrorDisplay');

// Chat Elements
const chatHistory = document.getElementById('chatHistory');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

// Unit Buttons
const metricBtn = document.getElementById('metricBtn');
const imperialBtn = document.getElementById('imperialBtn');

// ==========================================
// 1. UNIT & TYPE TOGGLE LOGIC
// ==========================================
metricBtn.addEventListener('click', () => {
    currentUnit = 'metric';
    metricBtn.className = "unit-btn flex-1 py-1.5 rounded-lg bg-indigo-600 text-white font-bold transition shadow-sm";
    imperialBtn.className = "unit-btn flex-1 py-1.5 rounded-lg bg-[#0f172a] text-slate-400 hover:text-slate-200 transition";

    heightInput.min = "100"; heightInput.max = "220"; heightInput.value = "170";
    weightInput.min = "10"; weightInput.max = "180"; weightInput.value = "70";
    heightValueDisplay.textContent = "170 cm";
    weightValueDisplay.textContent = "70 kg";
});

imperialBtn.addEventListener('click', () => {
    currentUnit = 'imperial';
    imperialBtn.className = "unit-btn flex-1 py-1.5 rounded-lg bg-indigo-600 text-white font-bold transition shadow-sm";
    metricBtn.className = "unit-btn flex-1 py-1.5 rounded-lg bg-[#0f172a] text-slate-400 hover:text-slate-200 transition";

    heightInput.min = "36"; heightInput.max = "86"; heightInput.value = "67";
    weightInput.min = "22"; weightInput.max = "400"; weightInput.value = "154";
    heightValueDisplay.textContent = "67 in";
    weightValueDisplay.textContent = "154 lbs";
});

// Target Group Selector (Male / Female / Child)
const typeButtons = document.querySelectorAll('.type-btn');
typeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        typeButtons.forEach(b => {
            b.className = "type-btn py-2 bg-[#0f172a] rounded-xl text-xs font-semibold border border-slate-700/60 text-slate-400 text-center transition hover:border-slate-500 hover:text-slate-200";
            b.classList.remove('active');
        });
        const clickedBtn = e.currentTarget;
        clickedBtn.className = "type-btn active py-2 bg-indigo-600/20 rounded-xl text-xs font-semibold border border-indigo-500 text-indigo-300 text-center transition shadow-sm";
        selectedType = clickedBtn.getAttribute('data-type');
        handleAgeValidation();
    });
});

// ==========================================
// 2. AGE VALIDATION
// ==========================================
function handleAgeValidation() {
    const age = parseInt(ageInput.value) || 25;
    if (ageErrorDisplay) {
        if (selectedType === 'child' && age < 2) {
            ageErrorDisplay.textContent = "Note: Standard BMI is valid for children aged 2+. Under 2 requires specialized growth charts.";
            ageErrorDisplay.className = "text-amber-400 text-xs mt-1 block";
        } else {
            ageErrorDisplay.textContent = "";
        }
    }
}

heightInput.addEventListener('input', () => {
    heightValueDisplay.textContent = `${heightInput.value} ${currentUnit === 'metric' ? 'cm' : 'in'}`;
});
weightInput.addEventListener('input', () => {
    weightValueDisplay.textContent = `${weightInput.value} ${currentUnit === 'metric' ? 'kg' : 'lbs'}`;
});
ageInput.addEventListener('input', handleAgeValidation);

// ==========================================
// 3. HEALTH METRICS CALCULATION
// ==========================================
function calculateMetrics() {
    let h = parseFloat(heightInput.value);
    let w = parseFloat(weightInput.value);
    let age = parseInt(ageInput.value) || 25;
    let bmi = 0;

    if (currentUnit === 'metric') {
        bmi = w / ((h / 100) ** 2);
    } else {
        bmi = (w / (h ** 2)) * 703;
    }

    bmi = bmi.toFixed(1);
    bmiScore.textContent = bmi;

    if (bmi < 18.5) {
        bmiCategory.textContent = 'Underweight';
        bmiCategory.className = 'text-sky-400 font-semibold';
    } else if (bmi < 24.9) {
        bmiCategory.textContent = 'Normal';
        bmiCategory.className = 'text-emerald-400 font-semibold';
    } else if (bmi < 29.9) {
        bmiCategory.textContent = 'Overweight';
        bmiCategory.className = 'text-amber-400 font-semibold';
    } else {
        bmiCategory.textContent = 'Obese';
        bmiCategory.className = 'text-red-400 font-semibold';
    }

    let weightKg = (currentUnit === 'metric') ? w : w * 0.453592;
    let heightCm = (currentUnit === 'metric') ? h : h * 2.54;
    
    let adjustmentFactor = (selectedType === 'male') ? 5 : (selectedType === 'child' ? 0 : -161);
    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + adjustmentFactor;
    let tdee = bmr * parseFloat(activityInput.value);
    
    if (goalInput.value === 'lose') tdee -= 500;
    if (goalInput.value === 'gain') tdee += 500;

    bmrScore.textContent = `${Math.round(bmr)}`;
    tdeeScore.textContent = `${Math.round(tdee)}`;
}

// ==========================================
// 4. BACKEND AI REPORT & CHAT FUNCTIONALITY (MARKED.JS INTEGRATED)
// ==========================================
async function callGroqAPI(promptText, targetContainer, isChat = false) {
    if (!isChat) {
        targetContainer.innerHTML = `<span class="text-indigo-400 font-medium animate-pulse">Generating professional AI clinical report...</span>`;
    }

    try {
        const res = await fetch("/api/ai-advice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: promptText })
        });

        if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);

        const data = await res.json();
        const replyText = data?.choices?.[0]?.message?.content || data?.reply || data?.error || "Error: Unexpected response format.";
        
        // Convert Markdown response into formatted HTML safely using Marked.js
        const parsedHTML = marked.parse(replyText);

        if (isChat) {
            targetContainer.innerHTML += `
                <div class="mt-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div class="text-indigo-300 font-semibold text-xs mb-1">AI Health Assistant:</div>
                    <div class="text-slate-200 text-xs space-y-2 markdown-output">${parsedHTML}</div>
                </div>`;
            targetContainer.scrollTop = targetContainer.scrollHeight;
        } else {
            targetContainer.innerHTML = `<div class="text-slate-200 text-xs space-y-2 markdown-output">${parsedHTML}</div>`;
        }
    } catch (err) {
        const errorMsg = `<span class="text-red-400">Error: Could not connect to backend server. Make sure Flask is running.</span>`;
        if (isChat) {
            targetContainer.innerHTML += `<div class="mt-2 text-red-400">${errorMsg}</div>`;
        } else {
            targetContainer.innerHTML = errorMsg;
        }
    }
}

// Main Report Generation on Form Submit
const calcForm = document.getElementById('calculatorForm');
if (calcForm) {
    calcForm.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateMetrics();
        
        const pName = (patientNameInput && patientNameInput.value) ? patientNameInput.value.trim() : 'Patient';
        const promptText = `Generate a detailed professional health & nutrition report for a ${selectedType} named ${pName}, aged ${ageInput.value}, with BMI ${bmiScore.textContent} (${bmiCategory.textContent}), BMR ${bmrScore.textContent} kcal, and target daily calories ${tdeeScore.textContent} kcal to achieve goal: ${goalInput.value}. Provide concise bullet points focusing on diet staples, workout frequency, and lifestyle adjustments.`;
        
        callGroqAPI(promptText, aiResponseContainer, false);
    });
}

// Chatbot Send Message Event
if (sendChatBtn && chatInput) {
    sendChatBtn.addEventListener('click', async () => {
        const question = chatInput.value.trim();
        if (!question) return;

        chatHistory.innerHTML += `
            <div class="mt-3 p-3 bg-indigo-950/30 rounded-xl border border-indigo-900/50">
                <div class="text-slate-400 font-semibold text-xs mb-1">You:</div>
                <div class="text-slate-100 text-xs">${question}</div>
            </div>`;
        chatInput.value = "";
        chatHistory.scrollTop = chatHistory.scrollHeight;

        const chatPrompt = `You are a clinical nutritionist. Answer this follow-up question concisely and helpfully based on a patient context (${selectedType}, age ${ageInput.value}, BMI ${bmiScore.textContent}): ${question}`;
        await callGroqAPI(chatPrompt, chatHistory, true);
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatBtn.click();
        }
    });
}

// Initial state load
handleAgeValidation();