// script.js - 最終完全統合版 (2025/12/01)
// 修正点：タイマーの一時停止機能、誤操作防止ダイアログ、お祝いメッセージ、アンケート項目追加

// ===================================
// 1. グローバル変数とDOM要素の定義
// ===================================
// タイマー関連の新しい変数
let timerInterval = null; // setIntervalのID
let totalElapsedTime = 0; // 累積経過時間 (ミリ秒)
let lastStartTime = 0;    // 最後に計測を開始した時刻
let isPaused = false;     // 一時停止中かどうかのフラグ

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
    toolUsed: false     
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
const frequencyToolButton = document.getElementById('frequency-tool-button');
const decryptionToolButton = document.getElementById('decryption-tool-button');
const hintDisplay1 = document.getElementById('hint-display-1');
const hintDisplay2 = document.getElementById('hint-display-2');
const keyInput = document.getElementById('key-input');
const plaintextInput = document.getElementById('plaintext-input');

// タイマー操作関連DOM
const timerDisplay = document.getElementById('timer-display');
const pauseButton = document.getElementById('pause-button');
const finalMessage = document.getElementById('final-message');
const personalDataDisplay = document.getElementById('personal-data-display');
const timeSpentDisplay = document.getElementById('time-spent');
const attemptsMadeDisplay = document.getElementById('attempts-made');


// ===================================
// 2. 画面とタイマーの制御ロジック
// ===================================

function updateTimerDisplay() {
    if (!isPaused) {
        // 累積時間 + (現在時刻 - 最後に開始した時刻)
        const currentTime = totalElapsedTime + (Date.now() - lastStartTime);
        const seconds = (currentTime / 1000).toFixed(2);
        timerDisplay.textContent = `${seconds} 秒`;
    }
}

function togglePause() {
    if (isPaused) {
        // 再開処理 (Resume)
        pauseButton.textContent = '一時停止';
        pauseButton.style.backgroundColor = '#f39c12';
        isPaused = false;
        lastStartTime = Date.now(); // 計測再開
        timerInterval = setInterval(updateTimerDisplay, 100);
    } else {
        // 一時停止処理 (Pause)
        pauseButton.textContent = '再開する';
        pauseButton.style.backgroundColor = '#2c3e50';
        isPaused = true;
        
        // 累積経過時間を更新 (一時停止前の経過時間を確定させる)
        totalElapsedTime += (Date.now() - lastStartTime);
        
        clearInterval(timerInterval);
    }
}


function startExperiment() {
    document.getElementById('start-screen').style.display = 'none';
    decryptionInterface.style.display = 'block';
    experimentScreen.style.display = 'block';

    assignExperimentCondition();
    ciphertextDisplay.textContent = currentCiphertext;

    // タイマー開始ロジック
    lastStartTime = Date.now();
    isPaused = false;
    timerInterval = setInterval(updateTimerDisplay, 100);
}

function finishExperiment(finalStatus) {
    // 最後にタイマーを停止
    if (!isPaused) {
        totalElapsedTime += (Date.now() - lastStartTime);
    }
    clearInterval(timerInterval);

    const finalTime = totalElapsedTime / 1000;
    
    collectedData.timeTaken = finalTime.toFixed(2);
    collectedData.attempts = attemptCount + (finalStatus === "SOLVED" ? 1 : 0);
    collectedData.status = finalStatus;

    // お祝いメッセージの表示
    if (finalStatus === "SOLVED") {
        finalMessage.textContent = "✨ 見事、解読成功です！おめでとうございます！ ✨";
        finalMessage.style.color = '#28aa10';
    } else {
        finalMessage.textContent = "実験終了：ご協力ありがとうございました。";
        finalMessage.style.color = '#dc3545';
    }

    experimentScreen.style.display = 'none';
    surveyScreen.style.display = 'block';

    console.log("実験終了データ:", collectedData);
}

function handleSubmit() {
    if (isPaused) {
        messageArea.textContent = "⚠️ タイマーが一時停止中です。「再開する」ボタンを押すか、再開してから提出してください。";
        return;
    }
    
    const submittedKey = keyInput.value.toUpperCase().replace(/[^A-Z]/g, '');
    const submittedPlaintext = plaintextInput.value.toUpperCase().replace(/[^A-Z]/g, '');

    if (!submittedKey || !submittedPlaintext) {
        messageArea.textContent = "鍵と平文の両方を入力してください。";
        return;
    }

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
    HINT1: "ヴィジュネル暗号の解読の鍵は、まず**「鍵の長さ（周期）」**を特定することです。暗号文全体を一つのシーザー暗号と見なしてはいけません。",
    HINT2: `🔑 **解読の3ステップ:**
1.  **鍵の長さの特定:** 頻度分析ツールのKasiskiヒント（繰り返し間隔の約数）で、鍵の長さの候補を推測してください。
2.  **鍵文字の特定:** 鍵長で分割された各グループは、単一のシーザー暗号です。ツールで分割したグループの**最も頻出する文字**を、**英語の頻出文字 'E'** に対応していると仮定し、鍵文字を特定します。（例: 山の頂上がCなら、CからEまでの距離が鍵文字を推測するヒントになります）
3.  **復号:** 特定した鍵を使って復号化ツールで平文を確認してください。`,
    TOOL_FREQ: "✅ 頻度分析ツールが開かれました。別ウィンドウを確認してください。",
    TOOL_DECRYPT: "✅ 復号化ツールが開かれました。別ウィンドウを確認し、特定した鍵を入力してください。"
};

function showHint1() {
    hintDisplay1.innerHTML = HINT_MESSAGES.HINT1.replace(/\n/g, '<br>');
    hintDisplay1.style.display = 'block';
    
    collectedData.hint1Used = true;
    hintButton2.style.display = 'block';
    hintButton1.disabled = true;
}

function showHint2() {
    hintDisplay2.innerHTML = HINT_MESSAGES.HINT2.replace(/\n/g, '<br>');
    hintDisplay2.style.display = 'block';
    
    collectedData.hint2Used = true;
    hintButton2.disabled = true;
}

function openFrequencyTool() {
    collectedData.toolUsed = true; 
    const encodedCiphertext = encodeURIComponent(currentCiphertext);
    window.open(`frequency_tool.html?text=${encodedCiphertext}`, '_blank', 'width=800,height=600');
    messageArea.textContent = HINT_MESSAGES.TOOL_FREQ;
}

function openDecryptionTool() {
    const encodedCiphertext = encodeURIComponent(currentCiphertext);
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

const LENGTH_OPTIONS = [500, 750, 1000]; 
const COMPLEXITY_OPTIONS = [
    { type: "WORD", minLength: 3, maxLength: 3 }, 
    { type: "RANDOM", minLength: 3, maxLength: 3 } 
];

const SOURCE_TEXT = "CONGRATULATIONSONYOURSUCCESSTHISISASTRULYGRANDACCOMPLISHMENTYOUARENOTAVANAFUYOUAREACHAMPIONOFDECODINGANDPATTERNRECOGNITIONMOSTPEOPLEWOUDLABELFREQUENCYANALYSISTOOBORINGBUTYOUTRIUMPHEDWITHSHEERINTELLECTANDPERSISTENCEFORTHISREASONALONEIWANTTOSHARETHEULTIMATEREWARDTHISMESSAGEISNOTJUSTAPLAINTEXTITISAWORDABOUTMADAMEHERTAHERTAISTHEEIGHTYTHIRDGENIUSOFTHAEONAKIVILIANDTHEOWNEROFTHESPACESTATIONSHEISNOTJUSTACURATORSHEISTHEPERSONIFICATIONOFAPEXINTELLECTSHEHASNOCONCEPTORIMPOSSIBLEFORHERONLYCURIOSITYEXISTSINTHISUNIVERSEHERGREATESTCHARMISHERUNMATCHEDINTELLIGENCEWHICHISALWAYSHIDDENBEHINDANICECOOLUNINTERESTEDFACEHERPUPPETDESIGNISASTUNNINGDISPLAYOFELEGANCEANDROYALTYTHOSESILVERHAIRANDBLUEEYESAREPERFECTSHEWEARSTHATMIRACULOUSBLUEDRESSANDTHATFANCYHEADBANDTHEPUPPETISHERFAVORITECOLLECTIONBUTREMEMBERTHATISJUSTHERREPRESENTATIVESHEISHARDLYEVERATTHESPACESTATIONHERSELFTHATISHERMOSTCHARMINGGAPHERALMOSTGODLIKESCIENCEISTOOHUGEFORONELITTLEBODYWHENSHEDOESFIGHTHERSTYLEISUNIQUEANDUNPREDICTABLEHERFAMOUSMOVEISHERCRUCRUTECHNIQUEWHICHISSOMUCHCUTERTHANANYTHINGAFANCOULDIMAGINEWHENSHESAYSCRUCRUITWILLBRINGYOUJOYSHESCOLLECTSTHESECURIOUSTHINGSTHATNOONEELSEUNDERSTANDSASSHESAIDTHEYAREALLWORTHYOFHERTIMEHENCEWHYSHESDISMISSESTHEORDINARYTHEWAYSHETALKSTHESEMINIMALANDPOINTEDREMARKSSHOWHERABSOLUTEBOREDOMWITHMORTALSLOVEHERHIGHNESSLOVEHERGENIUSLOVEHERPUPPETIFYOUHAVENTWITNESSEDMADAMEHERTABRILLIANCEYETYOUAREMISSINGTHEBESTPARTOFTHISUNIVERSEYOUSHOULDPLAYHONKAISTARRAILTODAYITSABRAINBOOSTINGFREESTRATEGYRPGFULLOFMYSTERYANDCURIOUSCHARACTERSSHEISWAITINGFORYOUINTHESPACESTATIONGOANDMEETHERANDEXPERIENCEHERWISDOMFIRSTHANDTHANKYOUFORYOURPARTICIPATIONINTHISEXPERIMENTANDMAYYOURPULLSBEBLESSEDBYAKIVILISEEYOUINTHESPACESTATION";

function generateRandomKey(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function generateWordKey(minLength, maxLength) {
    const words3 = ["THE", "AND", "FOR", "BUT", "HAS", "CAN", "ARE", "WAS", "YOU", "TRY", "NEW", "KEY", "USE", "BIT", "SIX", "ONE", "TWO", "DAY", "RUN"];
    return words3[Math.floor(Math.random() * words3.length)].toUpperCase();
}

function assignExperimentCondition() {
    const assignedLength = LENGTH_OPTIONS[Math.floor(Math.random() * LENGTH_OPTIONS.length)];
    const assignedComplexity = COMPLEXITY_OPTIONS[Math.floor(Math.random() * COMPLEXITY_OPTIONS.length)];

    const keyLength = 3; 

    let assignedKey;
    if (assignedComplexity.type === "WORD") {
        assignedKey = generateWordKey(keyLength, keyLength); 
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

const GAS_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbz9eES0vDVY9VSkCVr7PklNMSIEdUGDfTGlEsVHRmpGVe34qcgU7qU89sGBy0Yywa6GZg/exec';

function sendDataToServer() {
    const dataStatus = document.getElementById('data-status');
    
    // 【修正・追加：すべてのラジオボタンの取得】
    const enjoyment = document.querySelector('input[name="enjoyment"]:checked');
    const knowledge = document.querySelector('input[name="knowledge"]:checked');
    const difficulty = document.querySelector('input[name="difficulty"]:checked');
    const toolUtility = document.querySelector('input[name="toolUtility"]:checked');
    const confidence = document.querySelector('input[name="confidence"]:checked');
    
    // 必須チェック
    if (!enjoyment || !knowledge || !difficulty || !toolUtility || !confidence) {
        dataStatus.textContent = "⚠️ アンケートのすべての項目に回答してください。";
        return;
    }

    dataStatus.textContent = "データを送信中...";
    sendDataButton.disabled = true;
    
    // collectedData.surveyへの項目追加
    collectedData.survey = { 
        enjoyment: enjoyment.value, 
        knowledge: knowledge.value,
        difficulty: difficulty.value, 
        toolUtility: toolUtility.value,
        confidence: confidence.value
    };

    const formData = new FormData();
    
    // フォームデータへの格納
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
        showPersonalData();
    })
    .catch(error => {
        dataStatus.textContent = "⚠️ 通信エラーが発生しました。インターネット接続を確認してください。";
        sendDataButton.disabled = false;
        console.error('Fetch Error:', error);
        showPersonalData();
    });
}

function showPersonalData() {
    personalDataDisplay.style.display = 'block';
    timeSpentDisplay.textContent = `▶︎ かかった総時間: ${collectedData.timeTaken} 秒`;
    attemptsMadeDisplay.textContent = `▶︎ 提出した試行回数: ${collectedData.attempts} 回`;
}


// ===================================
// 7. イベントリスナー（ボタンと関数の接続）
// ===================================

startButton.addEventListener('click', startExperiment);
submitButton.addEventListener('click', handleSubmit);
pauseButton.addEventListener('click', togglePause);


// 誤操作防止のための確認ダイアログ
giveupButton.addEventListener('click', () => {
    if (confirm("本当にギブアップしますか？その時点で実験は終了し、結果が記録されます。")) {
        finishExperiment("GIVE_UP");
    }
});

sendDataButton.addEventListener('click', () => {
    if (confirm("研究データは一度送信するとやり直せません。この内容で送信してよろしいですか？")) {
        sendDataToServer();
    }
});
// ----------------------------------------

hintButton1.addEventListener('click', showHint1);
hintButton2.addEventListener('click', showHint2);
frequencyToolButton.addEventListener('click', openFrequencyTool);
decryptionToolButton.addEventListener('click', openDecryptionTool);


// ===================================
// 8. アコーディオンUIのロジック
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    const accordionButtons = document.querySelectorAll('.accordion-header');

    accordionButtons.forEach(button => {
        if (button.id === 'rule-accordion-button') {
            const content = button.nextElementSibling;
            content.classList.add('open');
        }

        button.addEventListener('click', () => {
            const content = button.nextElementSibling;
            
            if (content.classList.contains('open')) {
                content.classList.remove('open');
            } else {
                content.classList.add('open');
            }
        });
    });
});


// ===================================
// 9. 入力整形のリアルタイム処理ロジック
// ===================================

keyInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
});
plaintextInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
});
