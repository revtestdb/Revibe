/**
 * N8N Integration Center Logic
 * Handles communication between the Dashboard and N8N Webhooks.
 */

document.addEventListener('DOMContentLoaded', () => {
    setupN8nListeners();
    // Initialize with the default view
    renderN8nConfig('fetch');
});

/**
 * Sets up event listeners for the N8N modal.
 */
function setupN8nListeners() {
    // Expose Modal Controls globally to match HTML onclick attributes
    window.openN8nModal = () => {
        const modal = document.getElementById('n8nModal');
        if (modal) modal.classList.remove('hidden');
    };

    window.closeN8nModal = () => {
        const modal = document.getElementById('n8nModal');
        if (modal) modal.classList.add('hidden');
    };

    // Workflow Type Selector
    const selector = document.getElementById('n8nWorkflowSelect');
    if (selector) {
        selector.addEventListener('change', (e) => {
            renderN8nConfig(e.target.value);
        });
    }

    // Run Button
    const runBtn = document.getElementById('n8nRunBtn');
    if (runBtn) {
        runBtn.addEventListener('click', executeN8nWorkflow);
    }
}

/**
 * Renders the configuration UI based on the selected workflow mode.
 * @param {string} mode - 'fetch' or 'trigger'
 */
function renderN8nConfig(mode) {
    const container = document.getElementById('n8nConfigArea');
    if (!container) return;

    container.innerHTML = '';

    if (mode === 'fetch') {
        // --- FETCH TICKETS TEMPLATE ---
        // Defaults to last 7 days
        const today = new Date().toISOString().split('T')[0];
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        container.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                <div class="bg-slate-700/30 p-3 rounded border border-slate-600">
                    <p class="text-xs text-gray-400 mb-2"><i class="fa-solid fa-info-circle"></i> This workflow sends <code>startDate</code> and <code>endDate</code> as query parameters to your webhook.</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Start Date</label>
                        <input type="date" id="n8nStartDate" value="${lastWeek}" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-accent-blue outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">End Date</label>
                        <input type="date" id="n8nEndDate" value="${today}" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-accent-blue outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1">Target Region (Save Destination)</label>
                    <select id="n8nTargetRegion" class="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-accent-blue outline-none">
                        <option value="Master">Master (Global)</option>
                        <option value="KSA_Widget">KSA Widget</option>
                        <option value="UAE_Widget">UAE Widget</option>
                        <option value="ZA_Widget">ZA Widget</option>
                    </select>
                    <p class="text-[10px] text-gray-500 mt-1">Data returned will be saved to this dashboard region.</p>
                </div>
            </div>
        `;

        // Show the Save Checkbox for Fetch mode
        const saveOption = document.getElementById('n8nSaveOption');
        if (saveOption) saveOption.classList.remove('hidden');

        // Update button text
        const runBtn = document.getElementById('n8nRunBtn');
        if (runBtn) runBtn.innerHTML = '<i class="fa-solid fa-download"></i> Fetch Data';

    } else if (mode === 'trigger') {
        // --- GENERIC TRIGGER TEMPLATE ---
        container.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                <div class="bg-slate-700/30 p-3 rounded border border-slate-600">
                    <p class="text-xs text-gray-400 mb-2"><i class="fa-solid fa-bolt"></i> Sends a POST request with the JSON body below.</p>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-xs font-bold text-gray-400">JSON Payload</label>
                        <button onclick="formatN8nJson()" class="text-[10px] text-accent-blue hover:text-white transition-colors"><i class="fa-solid fa-code"></i> Format JSON</button>
                    </div>
                    <textarea id="n8nJsonData" rows="8" class="w-full bg-slate-900 border border-slate-600 rounded p-3 text-xs text-green-400 font-mono focus:border-accent-purple outline-none" placeholder='{\n  "action": "trigger_report",\n  "user": "admin"\n}'></textarea>
                </div>
            </div>
        `;

        // Hide the Save Checkbox for Trigger mode
        const saveOption = document.getElementById('n8nSaveOption');
        if (saveOption) saveOption.classList.add('hidden');

        // Update button text
        const runBtn = document.getElementById('n8nRunBtn');
        if (runBtn) runBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Trigger Workflow';
    }
}

/**
 * Formats the JSON in the textarea.
 */
window.formatN8nJson = () => {
    const textarea = document.getElementById('n8nJsonData');
    if (!textarea) return;
    try {
        const obj = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(obj, null, 2);
    } catch (e) {
        alert("Invalid JSON: " + e.message);
    }
};

/**
 * Executes the configured workflow.
 */
async function executeN8nWorkflow() {
    const mode = document.getElementById('n8nWorkflowSelect').value;
    const url = document.getElementById('n8nWebhookUrl').value.trim();
    const logArea = document.getElementById('n8nResponse');
    const runBtn = document.getElementById('n8nRunBtn');

    if (!url) {
        logArea.textContent = "Error: Webhook URL is required.";
        return;
    }

    // UI Loading State
    runBtn.disabled = true;
    const originalBtnText = runBtn.innerHTML;
    runBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Running...';
    logArea.textContent = "Initializing request...";

    try {
        let responseData;
        let fetchOptions = {};
        let finalUrl = url;

        if (mode === 'fetch') {
            // --- GET REQUEST ---
            const start = document.getElementById('n8nStartDate').value;
            const end = document.getElementById('n8nEndDate').value;

            // Construct URL with query parameters
            const urlObj = new URL(url);
            urlObj.searchParams.append('startDate', start);
            urlObj.searchParams.append('endDate', end);
            finalUrl = urlObj.toString();

            logArea.textContent = `GET ${finalUrl}...\nWaiting for response...`;

            fetchOptions = { method: 'GET' };

        } else {
            // --- POST REQUEST ---
            const jsonStr = document.getElementById('n8nJsonData').value;
            let body = {};
            if (jsonStr.trim()) {
                try {
                    body = JSON.parse(jsonStr);
                } catch (e) {
                    throw new Error("Invalid JSON in payload.");
                }
            }

            logArea.textContent = `POST ${finalUrl}...\nPayload: ${JSON.stringify(body).substring(0, 50)}...`;

            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            };
        }

        // Execute Fetch
        const res = await fetch(finalUrl, fetchOptions);

        if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
        }

        // Try parsing JSON, fallback to text
        const textRes = await res.text();
        try {
            responseData = JSON.parse(textRes);
        } catch (e) {
            responseData = { text: textRes, note: "Response was not JSON" };
        }

        // Display Response
        logArea.textContent = JSON.stringify(responseData, null, 2);

        // --- SAVE LOGIC (Only for Fetch mode) ---
        const saveCheckbox = document.getElementById('n8nSaveToDbInput');
        if (mode === 'fetch' && saveCheckbox && saveCheckbox.checked) {
            const region = document.getElementById('n8nTargetRegion').value;

            // Check if we have a valid array to save
            let dataToSave = null;
            if (Array.isArray(responseData)) {
                dataToSave = responseData;
            } else if (responseData && Array.isArray(responseData.data)) {
                dataToSave = responseData.data;
            }

            if (dataToSave && window.saveToDatabase) {
                logArea.textContent += `\n\n💾 Saving ${dataToSave.length} records to ${region}...`;
                await window.saveToDatabase(region, dataToSave, true);
                logArea.textContent += `\n✅ Saved successfully! Dashboard updated.`;
            } else {
                logArea.textContent += `\n\n⚠️ Warning: Could not save to database. Response must be an array or have a 'data' array property.`;
            }
        }

    } catch (error) {
        console.error("N8N Error:", error);
        logArea.textContent += `\n\n❌ Error: ${error.message}`;
    } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = originalBtnText;
    }
}