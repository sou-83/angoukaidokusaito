// decryption_tool_script.js

// --- 復号化機能 ---

function getCiphertextFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const ciphertext = urlParams.get('text');
    return ciphertext ? ciphertext.toUpperCase().replace(/[^A-Z]/g, '') : null;
}

function charToNum(char) {
    return char.charCodeAt(0) - 'A'.charCodeAt(0);
}

function numToChar(num) {
    return String.fromCharCode(num + 'A'.charCodeAt(0));
}

/**
 * ヴィジュネル暗号で復号化を行う
 */
function decryptVigenere(ciphertext, key) {
    let plaintext = "";
    let keyIndex = 0;

    for (let i = 0; i < ciphertext.length; i++) {
        const char = ciphertext[i];
        
        if (char >= 'A' && char <= 'Z') {
            const keyChar = key[keyIndex % key.length];
            
            const cNum = charToNum(char);
            const kNum = charToNum(keyChar);
            
            // 復号化の計算: (暗号文 - 鍵 + 26) mod 26
            const pNum = (cNum - kNum + 26) % 26;
            
            plaintext += numToChar(pNum);
            keyIndex++;
        }
    }
    return plaintext;
}

/**
 * UIからの入力を使って暗号文を復号するメイン関数
 */
function decryptCiphertext() {
    const keyInput = document.getElementById('decryption-key-input');
    const key = keyInput.value.toUpperCase().replace(/[^A-Z]/g, ''); 
    const ciphertext = getCiphertextFromURL();
    const resultDisplay = document.getElementById('decrypted-plaintext-display');

    if (!key) {
        resultDisplay.textContent = "鍵を入力してください。";
        return;
    }

    if (!ciphertext) {
        resultDisplay.textContent = "復号する暗号文が見つかりません。";
        return;
    }

    const decryptedText = decryptVigenere(ciphertext, key);
    
    resultDisplay.textContent = decryptedText;
    resultDisplay.style.color = 'black';
    resultDisplay.style.borderColor = '#28a745';
}


// --- メイン実行ロジック ---

window.onload = function() {
    const ciphertext = getCiphertextFromURL();
    const ciphertextDisplay = document.getElementById('ciphertext-display');

    if (ciphertext) {
        ciphertextDisplay.textContent = ciphertext;
    } else {
        ciphertextDisplay.textContent = "暗号文が見つかりませんでした。メイン画面から開いてください。";
    }
    
    // 復号ツールは、暗号文が見つかった場合、キー入力時に自動で大文字に整形されるようになっている
};