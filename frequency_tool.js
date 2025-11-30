// tool_script.js - 最終統合版 (2025/11/30)

const MAX_WIDTH = 500; // グラフの最大幅 (px)

// --- データ取得と解析 ---

function getCiphertextFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const ciphertext = urlParams.get('text');
    // アルファベット以外を削除して大文字で返す
    return ciphertext ? ciphertext.toUpperCase().replace(/[^A-Z]/g, '') : null;
}

function calculateFrequency(text) {
    const frequency = {};
    let totalChars = 0;

    for (let i = 0; i < 26; i++) {
        frequency[String.fromCharCode('A'.charCodeAt(0) + i)] = 0;
    }

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char >= 'A' && char <= 'Z') {
            frequency[char]++;
            totalChars++;
        }
    }
    return { frequency, totalChars };
}

/**
 * Kasiskiヒントのための繰り返しの間隔を検出
 */
function findRepeatingPatterns(text) {
    const minLength = 3; 
    const repetitions = {}; 
    
    for (let i = 0; i < text.length - minLength; i++) {
        for (let len = minLength; i + len <= text.length && len <= 6; len++) {
            const pattern = text.substring(i, i + len);
            
            if (repetitions[pattern]) {
                repetitions[pattern].push(i);
            } else {
                repetitions[pattern] = [i];
            }
        }
    }

    const hints = [];
    
    for (const pattern in repetitions) {
        const positions = repetitions[pattern];
        if (positions.length > 1) {
            for (let j = 1; j < positions.length; j++) {
                const distance = positions[j] - positions[j - 1];
                if (distance >= 2 && distance <= 20) {
                    hints.push(`"${pattern}" が ${distance} 文字間隔で出現しています。`);
                }
            }
        }
    }

    // 重複を排除し、間隔順にソートして表示
    return Array.from(new Set(hints))
                .sort((a, b) => {
                    const distA = parseInt(a.match(/(\d+)/)[0]);
                    const distB = parseInt(b.match(/(\d+)/)[0]);
                    return distA - distB;
                })
                .slice(0, 10); // 上位10つのヒントに制限
}


// --- グラフ描画 ---

function renderChart(containerDiv, data, barColor = '#3498db') {
    const { frequency, totalChars } = data;
    containerDiv.innerHTML = ''; 

    if (totalChars === 0) {
        containerDiv.textContent = "分析できるアルファベットが見つかりません。";
        return;
    }

    const maxFreq = Math.max(...Object.values(frequency));

    for (let i = 0; i < 26; i++) {
        const char = String.fromCharCode('A'.charCodeAt(0) + i);
        const count = frequency[char];
        const percentage = (count / totalChars) * 100;
        const barWidth = (count / maxFreq) * MAX_WIDTH; 

        const chartItem = document.createElement('div');
        chartItem.innerHTML = `
            <span class="bar-label">${char}: ${count} (${percentage.toFixed(1)}%)</span>
            <div class="chart-bar" style="width: ${barWidth}px; background: ${barColor};"></div>
        `;
        containerDiv.appendChild(chartItem);
    }
}


// --- 鍵長別分析（シーザー分析支援） ---

function analyzeByLength() {
    const keyLength = parseInt(document.getElementById('key-length-input').value);
    const ciphertext = getCiphertextFromURL();
    const resultsDiv = document.getElementById('caesar-analysis-results');
    resultsDiv.innerHTML = ''; 

    if (!ciphertext || isNaN(keyLength) || keyLength < 2 || keyLength > 20) {
        resultsDiv.innerHTML = "<p style='color:red;'>鍵の長さを2から20の間で正しく入力してください。</p>";
        return;
    }
    
    // 鍵長Lで暗号文をL個のグループに分解
    const dividedTexts = Array(keyLength).fill('').map(() => '');
    for (let i = 0; i < ciphertext.length; i++) {
        dividedTexts[i % keyLength] += ciphertext[i];
    }

    dividedTexts.forEach((text, index) => {
        const data = calculateFrequency(text);
        
        const section = document.createElement('div');
        section.innerHTML = `<h3>鍵文字 #${index + 1} の頻度 (文字数: ${text.length})</h3>`;
        section.style.border = '1px solid #ddd';
        section.style.padding = '10px';
        section.style.marginBottom = '15px';
        section.style.backgroundColor = '#fafafa';

        const chartDiv = document.createElement('div');
        chartDiv.id = `chart-key-${index}`;
        section.appendChild(chartDiv);
        resultsDiv.appendChild(section);

        renderChart(chartDiv, data, '#2ecc71');
    });
}

// --- メイン実行ロジック ---

window.onload = function() {
    const ciphertext = getCiphertextFromURL();
    const ciphertextDisplay = document.getElementById('ciphertext-display');
    const chartDiv = document.getElementById('frequency-chart');
    const kasiskiHintsDiv = document.getElementById('kasiski-hints');

    if (ciphertext) {
        ciphertextDisplay.textContent = ciphertext;
        
        // 1. 全体頻度分析の実行
        const data = calculateFrequency(ciphertext);
        renderChart(chartDiv, data);

        // 2. Kasiskiヒントの表示
        const hints = findRepeatingPatterns(ciphertext);
        if (hints.length > 0) {
            kasiskiHintsDiv.innerHTML = '<ul>' + hints.map(h => `<li>${h}</li>`).join('') + '</ul>';
        } else {
            kasiskiHintsDiv.innerHTML = '<p>繰り返しパターンが見つかりませんでした。暗号文の長さを調整してください。</p>';
        }

    } else {
        ciphertextDisplay.textContent = "暗号文が見つかりませんでした。メイン画面から開いてください。";
        chartDiv.innerHTML = '';
        kasiskiHintsDiv.innerHTML = '';
    }
};