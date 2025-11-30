// script.js - 最終統合版 (2025/11/30)

// ===================================
// 1. グローバル変数とDOM要素の定義
// ===================================
let startTime = 0;
let attemptCount = 0;
let currentCiphertext = "";
let currentCorrectAnswer = { key: "", plaintext: "" };

let collectedData = {
    timeTaken: 0, 
    attempts: 0,
    status: "",
    condition: {},
    survey: {},
    hint1Used: false,
    hint2Used: false,
    toolUsed: false   // どちらかのツールを使ったらtrue
};

// HTML要素の取得
const startButton = document.getElementById('start-button');
const submitButton = document.getElementById('submit-button');
const giveupButton = document.getElementById('giveup-button');
const sendDataButton = document.getElementById('send-data-button');
const experimentScreen = document.getElementById('experiment-screen');
const surveyScreen = document.getElementById('survey-screen');
const decryptionInterface = document.getElementById('decryption-interface');
const ciphertextDisplay = document.getElementById('ciphertext-display');
const messageArea = document.getElementById('message-area');
const hintButton1 = document.getElementById('hint-button-1');
const hintButton2 = document.getElementById('hint-button-2');
const frequencyToolButton = document.getElementById('frequency-tool-button'); // 修正
const decryptionToolButton = document.getElementById('decryption-tool-button'); // 修正
const hintDisplay1 = document.getElementById('hint-display-1');
const hintDisplay2 = document.getElementById('hint-display-2');
const keyInput = document.getElementById('key-input');
const plaintextInput = document.getElementById('plaintext-input');


// ===================================
// 2. 画面とタイマーの制御ロジック
// ===================================

function startExperiment() {
    document.getElementById('start-button').style.display = 'none';
    decryptionInterface.style.display = 'block';
    experimentScreen.style.display = 'block';

    assignExperimentCondition();
    ciphertextDisplay.textContent = currentCiphertext;

    startTime = Date.now();
    console.log("実験開始。正解の鍵:", currentCorrectAnswer.key); // デバッグ用
}

function finishExperiment(finalStatus) {
    const finalTime = (Date.now() - startTime) / 1000;
    
    collectedData.timeTaken = finalTime.toFixed(2);
    collectedData.attempts = attemptCount + (finalStatus === "SOLVED" ? 1 : 0);
    collectedData.status = finalStatus;

    experimentScreen.style.display = 'none';
    surveyScreen.style.display = 'block';

    console.log("実験終了データ:", collectedData);
}

function handleSubmit() {
    const submittedKey = keyInput.value.toUpperCase().replace(/[^A-Z]/g, '');
    const submittedPlaintext = plaintextInput.value.toUpperCase().replace(/[^A-Z]/g, '');

    if (!submittedKey || !submittedPlaintext) {
        messageArea.textContent = "鍵と平文の両方を入力してください。";
        return;
    }

    // ユーザーの鍵と平文で暗号文を生成し、サイトの暗号文と比較
    const reEncryptedCiphertext = encryptVigenere(submittedPlaintext, submittedKey);
    const isCorrect = reEncryptedCiphertext === currentCiphertext;

    if (!isCorrect) {
        attemptCount++;
        messageArea.textContent = `間違いです。再挑戦してください。 (試行回数: ${attemptCount})`;
    } else {
        messageArea.textContent = `正解！アンケートへ進んでください。`;
        finishExperiment("SOLVED");
    }
}

// ===================================
// 3. ヒントとツールのロジック
// ===================================

const HINT_MESSAGES = {
    HINT1: "この暗号は**ヴィジュネル暗号**です。解読法をGoogleなどで検索できます。",
    HINT2: "解読の最初のステップは、**鍵の長さ（周期）**を見つけることです。暗号文の中に、同じアルファベットの組が繰り返し現れる周期を探してください。",
    TOOL_FREQ: "✅ 頻度分析ツールが開かれました。別ウィンドウを確認してください。",
    TOOL_DECRYPT: "✅ 復号化ツールが開かれました。別ウィンドウを確認し、特定した鍵を入力してください。"
};

function showHint1() {
    hintDisplay1.textContent = HINT_MESSAGES.HINT1;
    hintDisplay1.style.display = 'block';
    
    collectedData.hint1Used = true;
    hintButton2.style.display = 'block';
    hintButton1.disabled = true;
}

function showHint2() {
    hintDisplay2.textContent = HINT_MESSAGES.HINT2;
    hintDisplay2.style.display = 'block';
    
    collectedData.hint2Used = true;
    hintButton2.disabled = true;
}

/**
 * 頻度分析ツールを開き、データに記録する (ツールボタン1)
 */
function openFrequencyTool() {
    // 【記録を行う】
    collectedData.toolUsed = true; 
    frequencyToolButton.disabled = true;
    
    const encodedCiphertext = encodeURIComponent(currentCiphertext);
    // frequency_tool.html を開く
    window.open(`frequency_tool.html?text=${encodedCiphertext}`, '_blank', 'width=800,height=600');
    
    messageArea.textContent = HINT_MESSAGES.TOOL_FREQ;
}

/**
 * 復号化ツールを開く (ツールボタン2)
 */
function openDecryptionTool() {
    // 【記録を行わない】
    decryptionToolButton.disabled = true;

    const encodedCiphertext = encodeURIComponent(currentCiphertext);
    // decryption_tool.html を開く
    window.open(`decryption_tool.html?text=${encodedCiphertext}`, '_blank', 'width=500,height=400');
    
    messageArea.textContent = HINT_MESSAGES.TOOL_DECRYPT;
}


// ===================================
// 4. 暗号ロジックのヘルパー関数
// ===================================

function charToNum(char) {
    return char.charCodeAt(0) - 'A'.charCodeAt(0);
}

function numToChar(num) {
    return String.fromCharCode(num + 'A'.charCodeAt(0));
}

/**
 * ヴィジュネル暗号で暗号化を行う
 */
function encryptVigenere(plaintext, key) {
    let ciphertext = "";
    let keyIndex = 0;
    
    for (let i = 0; i < plaintext.length; i++) {
        const char = plaintext[i];
        
        if (char >= 'A' && char <= 'Z') {
            const keyChar = key[keyIndex % key.length]; 
            
            const pNum = charToNum(char);
            const kNum = charToNum(keyChar);
            
            const cNum = (pNum + kNum) % 26;
            
            ciphertext += numToChar(cNum);
            keyIndex++;
        }
    }
    return ciphertext;
}


// ===================================
// 5. 実験条件の設定と暗号生成ロジック
// ===================================

// A. 暗号文の長さの定義 (文字数) - 解読率向上のため長めに設定
const LENGTH_OPTIONS = [500, 750, 1000]; 

// B. 鍵の複雑性の定義 (タイプ) - 鍵長を短く設定
const COMPLEXITY_OPTIONS = [
    { type: "WORD", minLength: 3, maxLength: 5 }, 
    { type: "RANDOM", minLength: 3, maxLength: 5 } 
];

// C. ランダムな平文の元となる文章（十分な長さ: 1200文字以上を推奨）
const SOURCE_TEXT = "HERTAISAPERSONOFIMMEASURABLEGENIUSANDUNQUESTIONABLEECCENTRICITYWITHINTHEUNIVERSEOFHONKAISTARRAILSHEISHIGHLYREGARDEDASTHEMASTEROFTHESIMULATEDUNIVERSEANDTHELEADERANDTRUEOWNEROFTHETITULARENIGMATICSPACEHERTASTATIONHERTRUEFORMISRARELYSEENASSHESPREFERSTOOPERATEANDINTERACTTHROUGHTELESCOPICALLYCONTROLLEDPUPPETSOFHERYOUNGERSELFADISTINCTIVEQUIRKTHATHIGHLIGHTSHERNATUREASANABSTRACTANDOFTENDETACHEDGENIUSSHEDOESNOTCAREMUCHFORANYTHINGEXCEPTTHINGSANDPHENOMENATHATCAPTUREHERFLEETINGATTENTIONANDCURIOSITYTHISSUPREMEINDIFFERENCEISACENTRALASPECTOFHERCOMPLEXPERSONALITYWHILESHEDISPLAYSSURPRISINGEMOTIONSOCCASIONALLYTHEYAREOFTENFLEETINGANDQUICKLYREVERTTOHERUSUALAPATHETICAIRHERGENIUSSTRETCHESBEYONDCONVENTIONALUNDERSTANDINGEARNINGHERAPLACEAMONGSTTHEILLUSTRIOUSANDINFAMOUSGENIUSOCIETYANORGANIZATIONOFPEOPLEWITHINCOMPARABLEBRAINPOWERANDINNOVATIVESPARKSHERPRIMARYMOTIVATIONINLIFESEEMSTOBEEASEDOWNEVERYTHINGSHETHINKSISSIMPLYBORINGTHISSENTIMENTISARECURRINGTHEMEINHERDIALOGUEANDACTIONSTHISEVERPRESENTDESIRETOALLEVIATEBOREDOMLEDHERTOJOINTHISMYSTERIOUSANDELUSIVEORGANIZATIONINTHESEARCHFORKNOWLEDEGETHATSATISFIESHERECCENTRICCRITERIASHESEESALMOSTEVERYTHINGINTHEDIALECTICOFINTERESTINGORBORINGWITHVERYLITTLEINBETWEENEVENTHESIMULATEDUNIVERSEWHICHISACRITICALGAMEPLAYFEATUREWASCREATEDBYHERTOSERVEASANEWEXPERIENCEANDAWAYTOCAPTUREHERINTERESTFORLONGERPERIODSTHANMOSTSORTIESINTORESEARCHNORMALLYDOTHISHOTELASPECTOFHERCHARACTERADDSAFASCINATINGLAYEROFDEPTHTOHERSCIENTIFICPURSUITSDESPITEHERCOLDANDDETACHEDDEMEANORHERTAISNOTWITHOUTASTRANGEFORMOFCHARISMAANDACLEARWITHERAPPARELISICONICCONSISTINGOFAGOTHICLOLITALIKEDRESSWHICHEMBODIESHERUNUSUALLYYOUTHFULAPPEARANCEDESPITEBEINGOVERA"; 
// ※ 1200文字程度の自然な文章に置き換えた例。

function generateRandomKey(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function generateWordKey(minLength, maxLength) {
    const words = ["SCIENCE", "LOGIC", "CIPHER", "EXPERIMENT", "RESEARCH", "STUDY", "DATA", "ANALYSIS", "THEORY", "CODE", "PUZZLE", "SOLVE"];
    
    const validWords = words.filter(word => word.length >= minLength && word.length <= maxLength);

    if (validWords.length === 0) {
        const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
        return generateRandomKey(length);
    }
    
    return validWords[Math.floor(Math.random() * validWords.length)].toUpperCase();
}

function assignExperimentCondition() {
    const assignedLength = LENGTH_OPTIONS[Math.floor(Math.random() * LENGTH_OPTIONS.length)];
    const assignedComplexity = COMPLEXITY_OPTIONS[Math.floor(Math.random() * COMPLEXITY_OPTIONS.length)];

    const keyLengthRange = assignedComplexity.maxLength - assignedComplexity.minLength + 1;
    const keyLength = Math.floor(Math.random() * keyLengthRange) + assignedComplexity.minLength;

    let assignedKey;
    if (assignedComplexity.type === "WORD") {
        assignedKey = generateWordKey(assignedComplexity.minLength, assignedComplexity.maxLength);
    } else {
        assignedKey = generateRandomKey(keyLength).toUpperCase();
    }

    const start = Math.floor(Math.random() * (SOURCE_TEXT.length - assignedLength));
    const assignedPlaintext = SOURCE_TEXT.substring(start, start + assignedLength);
    
    currentCiphertext = encryptVigenere(assignedPlaintext, assignedKey);

    currentCorrectAnswer.key = assignedKey;
    currentCorrectAnswer.plaintext = assignedPlaintext;

    collectedData.condition = {
        length: assignedLength,
        complexityType: assignedComplexity.type,
        keyLength: assignedKey.length
    };
}


// ===================================
// 6. データ送信ロジック (GAS連携)
// ===================================

// **【重要】** ここにあなたの「ウェブアプリのURL」を貼り付けてください！
const GAS_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbz9eES0vDVY9VSkCVr7PklNMSIEdUGDfTGlEsVHRmpGVe34qcgU7qU89sGBy0Yywa6GZg/exec';

function sendDataToServer() {
    const dataStatus = document.getElementById('data-status');
    dataStatus.textContent = "データを送信中...";
    
    const enjoyment = document.querySelector('input[name="enjoyment"]:checked');
    const knowledge = document.querySelector('input[name="knowledge"]:checked');

    if (!enjoyment || !knowledge) {
        dataStatus.textContent = "⚠️ アンケートのすべての項目に回答してください。";
        return;
    }
    
    collectedData.survey = { enjoyment: enjoyment.value, knowledge: knowledge.value };

    const formData = new FormData();
    
    formData.append('timeTaken', collectedData.timeTaken);
    formData.append('attempts', collectedData.attempts);
    formData.append('status', collectedData.status);
    formData.append('condition', JSON.stringify(collectedData.condition)); 
    formData.append('survey', JSON.stringify(collectedData.survey));     
    formData.append('hint1Used', collectedData.hint1Used);
    formData.append('hint2Used', collectedData.hint2Used);
    formData.append('toolUsed', collectedData.toolUsed);
    
    fetch(GAS_ENDPOINT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        body: formData   
    })
    .then(response => {
        dataStatus.textContent = "✅ データ送信が完了しました！ご協力ありがとうございました。";
        document.getElementById('send-data-button').disabled = true;
    })
    .catch(error => {
        dataStatus.textContent = "⚠️ 通信エラーが発生しました。インターネット接続を確認してください。";
        console.error('Fetch Error:', error);
    });
}

// ===================================
// 7. イベントリスナー（ボタンと関数の接続）
// ===================================

startButton.addEventListener('click', startExperiment);
submitButton.addEventListener('click', handleSubmit);
giveupButton.addEventListener('click', () => finishExperiment("GIVE_UP"));
hintButton1.addEventListener('click', showHint1);
hintButton2.addEventListener('click', showHint2);
frequencyToolButton.addEventListener('click', openFrequencyTool); // 修正
decryptionToolButton.addEventListener('click', openDecryptionTool); // 修正

sendDataButton.addEventListener('click', sendDataToServer); 

// ===================================
// 8. 入力整形のリアルタイム処理ロジック
// ===================================

keyInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
});
plaintextInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
});