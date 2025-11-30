// tool_script.js - 最終再修正版 (2025/12/01)
// 修正点：Kasiskiヒントの安定性向上 (パターン長調整)、および検出された文字列の表示

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
 * ある数字の約数をすべて返す
 */
function getDivisors(n) {
    const divisors = new Set();
    for (let i = 2; i * i <= n; i++) { // 1とn自身を除く
        if (n % i === 0) {
            divisors.add(i);
            divisors.add(n / i);
        }
    }
    return Array.from(divisors).sort((a, b) => a - b);
}

/**
 * Kasiskiヒントのための繰り返しの間隔を検出し、鍵長の候補を提示
 */
function findRepeatingPatterns(text) {
    const MIN_PATTERN_LENGTH = 3; // 【再修正：3文字に戻す】
    const MAX_PATTERN_LENGTH = 7; // 【再修正：7文字に拡大】
    const MAX_DISTANCE = 25; // 距離の最大値を25に拡大 (鍵長5までの倍数を見つけやすく)
    const repetitions = {}; 
    
    // 1. 繰り返しのパターンと位置を検出
    for (let i = 0; i < text.length - MIN_PATTERN_LENGTH; i++) {
        for (let len = MIN_PATTERN_LENGTH; i + len <= text.length && len <= MAX_PATTERN_LENGTH; len++) {
            const pattern = text.substring(i, i + len);
            
            if (repetitions[pattern]) {
                repetitions[pattern].push(i);
            } else {
                repetitions[pattern] = [i];
            }
        }
    }

    const distanceData = {};
    const patternDistanceMap = {}; // 【新規：どのパターンがどの距離で出現したかを記録】
    
    // 2. 距離を計算し、距離の頻度を集計
    for (const pattern in repetitions) {
        const positions = repetitions[pattern];
        if (positions.length > 1) {
            for (let j = 1; j < positions.length; j++) {
                const distance = positions[j] - positions[j - 1];
                if (distance >= 2 && distance <= MAX_DISTANCE) {
                    // 距離ごとの頻度をカウント
                    distanceData[distance] = (distanceData[distance] || 0) + 1;

                    // 距離と出現パターンのマッピングを記録 (重複回避のためSetを使用)
                    if (!patternDistanceMap[distance]) {
                        patternDistanceMap[distance] = new Set();
                    }
                    patternDistanceMap[distance].add(pattern);
                }
            }
        }
    }

    const uniqueCandidates = new Set();
    const hintsList = [];
    
    // 3. 頻度の高い距離から鍵長候補（約数）を抽出
    const sortedDistances = Object.entries(distanceData)
        .sort(([, countA], [, countB]) => countB - countA) // 頻度順にソート
        .slice(0, 15); // 上位15つの距離を使用

    for (const [distanceStr, count] of sortedDistances) {
        const distance = parseInt(distanceStr);
        const divisors = getDivisors(distance);
        
        // 鍵長の候補として2～5の約数のみをハイライト
        const candidates = divisors.filter(d => d >= 2 && d <= 5); 
        
        let candidateString = 'なし';
        if (candidates.length > 0) {
            candidateString = candidates.map(c => `**${c}**`).join(', ');
            candidates.forEach(c => uniqueCandidates.add(c));
        }

        // 該当距離の主要なパターンを最大3つ抽出
        const patterns = Array.from(patternDistanceMap[distance] || [])
                              .slice(0, 3)
                              .map(p => `"${p}"`);
        const patternString = patterns.join(', ');

        hintsList.push({
            distance: distance,
            count: count,
            candidateString: candidateString,
            patterns: patternString // 【新規：パターン文字列を追加】
        });
    }

    return { hintsList, uniqueCandidates: Array.from(uniqueCandidates).sort((a, b) => a - b) };
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

    resultsDiv.innerHTML += `<p style="font-weight:bold; color:#0056b3;">🔑 鍵文字推測のヒント: 最も高い棒（最も頻出する文字）が英語の頻出文字 '**E**' に対応していると仮定して、鍵文字を推測してください。</p>`;


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
        const { hintsList, uniqueCandidates } = findRepeatingPatterns(ciphertext);
        
        if (hintsList.length > 0) {
            let html = '<p>パターンが繰り返し出現した距離（間隔）と、その約数（鍵長候補）です:</p>';
            html += '<table style="width:100%; border-collapse: collapse;"><tr><th style="border: 1px solid #ccc; padding: 5px;">間隔 (距離)</th><th style="border: 1px solid #ccc; padding: 5px;">出現回数</th><th style="border: 1px solid #ccc; padding: 5px;">鍵長候補 (約数)</th><th style="border: 1px solid #ccc; padding: 5px;">検出パターン (例)</th></tr>';
            
            hintsList.forEach(item => {
                html += `<tr>
                            <td style="border: 1px solid #ccc; padding: 5px;">${item.distance}</td>
                            <td style="border: 1px solid #ccc; padding: 5px;">${item.count}</td>
                            <td style="border: 1px solid #ccc; padding: 5px;">${item.candidateString}</td>
                            <td style="border: 1px solid #ccc; padding: 5px; font-size: 0.9em;">${item.patterns}</td>
                        </tr>`; // 【新規：パターン文字列を表示】
            });
            html += '</table>';
            
            html += `<p style="margin-top:15px; font-weight:bold; color:#d35400;">総合的な鍵長の候補（距離の約数から推測）: ${uniqueCandidates.length > 0 ? uniqueCandidates.join(', ') : 'なし'}</p>`;
            
            kasiskiHintsDiv.innerHTML = html;
        } else {
            kasiskiHintsDiv.innerHTML = '<p>繰り返しパターンが見つかりませんでした。暗号文の長さや条件を確認してください。</p>';
        }

    } else {
        ciphertextDisplay.textContent = "暗号文が見つかりませんでした。メイン画面から開いてください。";
        chartDiv.innerHTML = '';
        kasiskiHintsDiv.innerHTML = '';
    }
};
