const http = require('http');
const { execSync } = require('child_process');

// Subsystem ID to manufacturer lookup (last 4 chars of SUBSYS)
const MANUFACTURERS = {
    '10DE': 'NVIDIA',
    '1458': 'MSI',
    '1462': 'Gigabyte',
    '19DA': 'ASUS',
    '1043': 'ASUS',
    '107D': 'Zotac',
    '104D': 'EVGA',
    '10BD': 'PNY',
    '10CF': 'Palit',
    '1554': 'Inno3D',
    '196E': 'AORUS',
    '1A02': 'GALAX',
    '1B49': 'Inno3D',
    '1C10': 'ASRock',
    '1D05': 'XFX'
};

function getManufacturer(subsysId) {
    let id = subsysId;
    if (id.startsWith('0x')) {
        id = id.slice(2);
    }
    const vendor = id.slice(-4);
    return MANUFACTURERS[vendor] || 'Unknown';
}

// Get GPU data
function getGPUs() {
    try {
        const output = execSync(
            'nvidia-smi --query-gpu=name,temperature.gpu,power.draw,power.limit,utilization.gpu,memory.used,memory.total,gpu_bus_id,pci.sub_device_id --format=csv,noheader',
            { encoding: 'utf8' }
        );
        return output.trim().split('\n').map((line, i) => {
            const parts = line.split(',').map(p => p.trim());
            const subDeviceId = parts[8]?.trim() || '';
            const manufacturer = getManufacturer(subDeviceId);
            return {
                id: i,
                name: parts[0] || `GPU ${i}`,
                manufacturer,
                temp: parseFloat(parts[1]) || 0,
                powerDraw: parseFloat(parts[2]?.replace('W', '')) || 0,
                powerLimit: parseFloat(parts[3]?.replace('W', '')) || 0,
                utilization: parseFloat(parts[4]?.replace('%', '')) || 0,
                memoryUsed: parseFloat(parts[5]?.replace('MiB', '')) || 0,
                memoryTotal: parseFloat(parts[6]?.replace('MiB', '')) || 0
            };
        });
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GPU Temperature Monitor</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:sans-serif;background:#0f0c29;color:#fff;padding:20px}
.header{text-align:center;margin-bottom:20px}
h1{background:linear-gradient(45deg,#00f2fe,#4facfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.gpus{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px}
.card{background:rgba(255,255,255,0.1);border-radius:16px;padding:20px;border:1px solid rgba(255,255,255,0.2)}
.card h3{color:#4facfe;margin-bottom:8px}
.manufacturer{font-size:0.7em;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
.grid-rows{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.meter{margin-bottom:10px}
.label{font-size:0.7em;color:#aaa;margin-bottom:4px;text-transform:uppercase}
.value{font-size:1.2em;font-weight:bold}
.bar{height:8px;background:rgba(255,255,255,0.1);border-radius:8px;overflow:hidden}
.fill{height:100%;border-radius:8px;transition:width 0.3s ease}
.temp .fill{background:linear-gradient(90deg,#ff6b6b,#f06595)}
.power .fill{background:linear-gradient(90deg,#4facfe,#00f2fe)}
.util .fill{background:linear-gradient(90deg,#6a11cb,#2575fc)}
.mem .fill{background:linear-gradient(90deg,#84fab0,#8fd3f4)}
.chart-container{position:relative;height:150px;margin-top:15px}
.summary{text-align:center;margin-top:20px;background:rgba(255,255,255,0.1);padding:20px;border-radius:16px;display:flex;gap:40px;justify-content:center;flex-wrap:wrap}
.summary-item span:first-child{font-size:3em;font-weight:bold;color:#00f2fe}
.summary-item span:last-child{color:#aaa;margin-top:5px;display:block;font-size:0.9em}
</style>
<body>
<div class="header"><h1>GPU Temperature Monitor</h1><div id="status">Loading...</div></div>
<div class="gpus" id="gpuContainer"></div>
<div class="summary">
    <div class="summary-item"><span id="avgTemp">--</span><span>Avg Temp</span></div>
    <div class="summary-item"><span id="maxTemp">--</span><span>Max Temp</span></div>
    <div class="summary-item"><span id="totalPower">--</span><span>Total Power</span></div>
    <div class="summary-item"><span id="gpuCount">--</span><span>GPUs</span></div>
</div>
<script>
let gpus = [];
const tempHistory = {};

setInterval(async () => {
    try {
        const r = await fetch('/api/gpus');
        gpus = await r.json();

        // Add current temps to history
        gpus.forEach(gpu => {
            if (!tempHistory[gpu.id]) tempHistory[gpu.id] = [];
            tempHistory[gpu.id].push(gpu.temp);
            if (tempHistory[gpu.id].length > 30) tempHistory[gpu.id].shift();
        });

        updateUI();
    } catch(e) { console.error(e); }
}, 1000);

// Initialize cards once
function initCards() {
    const container = document.getElementById('gpuContainer');
    if (container.children.length === 0 && gpus.length > 0) {
        let html = '';
        for (let i = 0; i < gpus.length; i++) {
            html += '<div class="card"><h3 id="gpu-name-' + i + '">GPU ' + i + '</h3><div class="manufacturer" id="gpu-man-' + i + '"></div>';
            html += '<div class="grid-rows">';
            html += '<div class="meter temp"><div class="label">Temperature</div><div class="value" id="gpu-temp-' + i + '">--°C</div><div class="bar"><div class="fill temp" style="width:0%"></div></div></div>';
            html += '<div class="meter power"><div class="label">Power</div><div class="value" id="gpu-power-' + i + '">--/-- W</div><div class="bar"><div class="fill power" style="width:0%"></div></div></div>';
            html += '<div class="meter util"><div class="label">Utilization</div><div class="value" id="gpu-util-' + i + '">--%</div><div class="bar"><div class="fill util" style="width:0%"></div></div></div>';
            html += '<div class="meter mem"><div class="label">Memory</div><div class="value" id="gpu-mem-' + i + '">--/-- MB</div></div>';
            html += '</div><div class="chart-container"><canvas id="chart-' + i + '"></canvas></div></div>';
        }
        container.innerHTML = html;
        createCharts();
    }
}

function createCharts() {
    for (let i = 0; i < gpus.length; i++) {
        const canvas = document.getElementById('chart-' + i);
        if (canvas) {
            new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Temp', data: [], borderColor: '#ff6b6b', backgroundColor: '#ff6b6b20', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0 }] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { display: false }, y: { min: 0, max: 100, display: true, grid: { color: 'rgba(255,255,255,0.1)' } } }
                }
            });
        }
    }
}

function updateUI() {
    initCards();

    let totalTemp = 0, maxTemp = 0, totalPower = 0;

    gpus.forEach(gpu => {
        const pct = (gpu.temp / 100) * 100;
        const powerPct = Math.min((gpu.powerDraw/gpu.powerLimit)*100, 100);

        totalTemp += gpu.temp;
        maxTemp = Math.max(maxTemp, gpu.temp);
        totalPower += gpu.powerDraw;

        document.getElementById('gpu-name-' + gpu.id).textContent = gpu.name;
        document.getElementById('gpu-man-' + gpu.id).textContent = gpu.manufacturer;
        document.getElementById('gpu-temp-' + gpu.id).innerHTML = gpu.temp + '°C';
        document.getElementById('gpu-power-' + gpu.id).textContent = gpu.powerDraw.toFixed(1) + ' / ' + gpu.powerLimit.toFixed(1) + ' W';
        document.getElementById('gpu-util-' + gpu.id).textContent = gpu.utilization.toFixed(1) + '%';
        document.getElementById('gpu-mem-' + gpu.id).textContent = gpu.memoryUsed.toFixed(0) + ' / ' + gpu.memoryTotal.toFixed(0) + ' MB';

        const tempBar = document.querySelector('#gpuContainer .card:nth-child(' + (gpu.id + 1) + ') .temp .fill');
        if (tempBar) tempBar.style.width = pct + '%';
        const powerBar = document.querySelector('#gpuContainer .card:nth-child(' + (gpu.id + 1) + ') .power .fill');
        if (powerBar) powerBar.style.width = powerPct + '%';

        // Update chart data
        const canvas = document.getElementById('chart-' + gpu.id);
        if (canvas && canvas.chartInstance) {
            canvas.chartInstance.data.datasets[0].data = tempHistory[gpu.id];
            canvas.chartInstance.update();
        }
    });

    if (gpus.length > 0) {
        document.getElementById('status').textContent = 'Monitoring ' + gpus.length + ' GPU(s)';
        document.getElementById('avgTemp').textContent = (totalTemp / gpus.length).toFixed(1) + '°C';
        document.getElementById('maxTemp').textContent = maxTemp.toFixed(1) + '°C';
        document.getElementById('totalPower').textContent = totalPower.toFixed(1) + 'W';
        document.getElementById('gpuCount').textContent = gpus.length;
    }
}

updateUI();
</script>
</body></html>`;

const server = http.createServer((req, res) => {
    if (req.url === '/api/gpus') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getGPUs()));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log('GPU Monitor on port ' + PORT);
    setTimeout(() => require('child_process').spawn('explorer', ['http://localhost:' + PORT]), 500);
});
