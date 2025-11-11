// Glorp AI Engine - Pure Nonsense Generator

// Configuration table for response styling based on keywords, NEED THIS IN AN CONFIG FILE INSTEAD, AND MUCH MORE COMPLETE AND LOGICAL
const STYLE_CONFIG = {
    // Programming related keywords (ALWAYS show codeblock)
    'program': { requireCodeblock: true, codeblockSize: 'large', wordCountMultiplier: 0.9, historyMultiplier: 1.5, formatType: 'code' },
    'script': { requireCodeblock: true, codeblockSize: 'large', wordCountMultiplier: 0.8, historyMultiplier: 1.4, formatType: 'code' },
    'code': { requireCodeblock: true, codeblockSize: 'medium', wordCountMultiplier: 0.6, historyMultiplier: 1.2, formatType: 'code' },
    'function': { requireCodeblock: true, codeblockSize: 'medium', wordCountMultiplier: 0.7, historyMultiplier: 1.3, formatType: 'code' },
    'algorithm': { requireCodeblock: true, codeblockSize: 'large', wordCountMultiplier: 0.8, historyMultiplier: 1.4, formatType: 'code' },
    'debug': { requireCodeblock: true, codeblockSize: 'large', wordCountMultiplier: 0.8, historyMultiplier: 1.4, formatType: 'code' },
    'build': { requireCodeblock: true, codeblockSize: 'large', wordCountMultiplier: 0.7, historyMultiplier: 1.3, formatType: 'code' },
    
    // Writing related keywords
    'essay': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 2.0, historyMultiplier: 0, formatType: 'text' },
    'paragraph': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 1.5, historyMultiplier: 0, formatType: 'text' },
    'write': { requireCodeblock: false, codeblockSize: 'small', wordCountMultiplier: 0.9, historyMultiplier: 0.5, formatType: 'text' },
    'explain': { requireCodeblock: false, codeblockSize: 'small', wordCountMultiplier: 1.2, historyMultiplier: 0.6, formatType: 'text' },
    'describe': { requireCodeblock: false, codeblockSize: 'small', wordCountMultiplier: 1.0, historyMultiplier: 0.5, formatType: 'text' },
    
    // Lists and structured content (ALWAYS format as list/steps)
    'list': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 0.7, historyMultiplier: 0, formatType: 'list' },
    'steps': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 0.8, historyMultiplier: 0, formatType: 'steps' },
    'points': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 0.7, historyMultiplier: 0, formatType: 'list' },
    'how': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 0.8, historyMultiplier: 0, formatType: 'steps' },
    
    // Thank you keywords (short responses with happy endings)
    'thanks': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 0.2, historyMultiplier: 0, formatType: 'thanks', happyMultiplier: 2.0 },
    'thank': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 0.2, historyMultiplier: 0, formatType: 'thanks', happyMultiplier: 2.0 },
    'appreciate': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 0.25, historyMultiplier: 0, formatType: 'thanks', happyMultiplier: 1.8 },
    'awesome': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 0.3, historyMultiplier: 0, formatType: 'thanks', happyMultiplier: 1.5 },
    'great': { requireCodeblock: false, codeblockSize: null, wordCountMultiplier: 0.3, historyMultiplier: 0, formatType: 'thanks', happyMultiplier: 1.5 },
    
    // Special keywords that inherit previous message style
    'fix': { inheritPrevious: true, wordCountMultiplier: 1.0 },
    'create': { inheritPrevious: true, wordCountMultiplier: 1.0 },
    'update': { inheritPrevious: true, wordCountMultiplier: 1.0 },
    'change': { inheritPrevious: true, wordCountMultiplier: 1.0 }
};

const CODEBLOCK_SIZES = {
    'small': { min: 3, max: 8 },
    'medium': { min: 8, max: 15 },
    'large': { min: 15, max: 30 }
};

// Punctuation for natural-looking text
const PUNCTUATION = ['.', '.', '.', '!', '?', ','];
const SENTENCE_ENDERS = ['.', '.', '!', '?'];
const HAPPY_ENDERS = ['!', '!!', '!!!', '. :)', '!! :)', '!!! :)', '. :D', '!! :D', '!!! :D'];

// Vowels and consonants for word generation
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'oo', 'ee', 'aa', 'orp', 'oink'];
const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'z', 'gl', 'pr', 'tr', 'br', 'gr', 'bl', 'fl', 'pl'];

// Special glorp-themed additions
const GLORP_PREFIXES = ['gl', 'gr', 'bl', 'pr'];
const GLORP_SUFFIXES = ['orp', 'unk', 'oink', 'eep', 'oop'];

// Chat history and state
let chatLengthMultiplier = 1.0;
let messageCount = 0;
let messageHistory = [];
let happyEndingMultiplier = 1.0;
let lastResponseStyle = null; // Track the style used for the last response for things like fix and create

/**
 * Generate a single nonsense word
 */
function generateNonsenseWord() { // NEED TO ADD A CURSE WORD FILTER HERE LATER TODO
    const syllables = Math.floor(Math.random() * 3) + 1; // 1-3 syllables
    let word = '';
    
    // Sometimes start with a glorp prefix
    if (Math.random() < 0.3) {
        word += GLORP_PREFIXES[Math.floor(Math.random() * GLORP_PREFIXES.length)];
    }
    
    for (let i = 0; i < syllables; i++) {
        // Alternate between consonants and vowels
        if (i % 2 === 0 || word === '') {
            word += CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
        }
        word += VOWELS[Math.floor(Math.random() * VOWELS.length)];
        
        // Sometimes add another consonant
        if (Math.random() < 0.4) {
            word += CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
        }
    }
    
    // Sometimes end with a glorp suffix
    if (Math.random() < 0.25) {
        word += GLORP_SUFFIXES[Math.floor(Math.random() * GLORP_SUFFIXES.length)];
    }
    
    return word;
}

/**
 * Generate nonsense code with random syntax elements
 */
function generateNonsenseCode(lineCount) {
    const lines = [];
    const codeKeywords = ['glorp', 'florp', 'blop', 'zork', 'prunk', 'glorpify', 'blorpinate'];
    const operators = ['==', '!=', '>', '<', '&&', '||', '+', '-', '*', '/', '%'];
    const brackets = ['(', ')', '{', '}', '[', ']'];
    
    let indentLevel = 0;
    
    for (let i = 0; i < lineCount; i++) {
        let line = '';
        const indent = '  '.repeat(Math.max(0, indentLevel));
        
        const lineType = Math.random();
        
        if (lineType < 0.3) {
            // Function declaration
            const keyword = codeKeywords[Math.floor(Math.random() * codeKeywords.length)];
            const funcName = generateNonsenseWord();
            const paramName = generateNonsenseWord();
            line = `${indent}<span class="code-keyword">${keyword}</span> <span class="code-function">${funcName}</span><span class="code-bracket">(</span>${paramName}<span class="code-bracket">)</span> <span class="code-bracket">{</span>`;
            indentLevel++;
        } else if (lineType < 0.5) {
            // Variable assignment
            const op = operators[Math.floor(Math.random() * operators.length)];
            const varName = generateNonsenseWord();
            const value = generateNonsenseWord();
            const hasCall = Math.random() < 0.5;
            line = `${indent}${varName} <span class="code-operator">${op}</span> ${hasCall ? `<span class="code-function">${value}</span><span class="code-bracket">()</span>` : `<span class="code-number">${value}</span>`};`;
        } else if (lineType < 0.7) {
            // If statement
            const condition = generateNonsenseWord();
            const op = operators[Math.floor(Math.random() * operators.length)];
            const num = Math.floor(Math.random() * 100);
            line = `${indent}<span class="code-keyword">if</span> <span class="code-bracket">(</span>${condition} <span class="code-operator">${op}</span> <span class="code-number">${num}</span><span class="code-bracket">)</span> <span class="code-bracket">{</span>`;
            indentLevel++;
        } else if (lineType < 0.85) {
            // Regular statement
            const objName = generateNonsenseWord();
            const methodName = generateNonsenseWord();
            const hasParam = Math.random() < 0.5;
            line = `${indent}${objName}.<span class="code-function">${methodName}</span><span class="code-bracket">(</span>${hasParam ? generateNonsenseWord() : ''}<span class="code-bracket">)</span>;`;
        } else {
            // Closing bracket
            if (indentLevel > 0) {
                indentLevel--;
                line = `${'  '.repeat(indentLevel)}<span class="code-bracket">}</span>`;
            } else {
                const funcName = generateNonsenseWord();
                line = `${indent}<span class="code-function">${funcName}</span><span class="code-bracket">()</span>;`;
            }
        }
        
        lines.push(line);
    }
    
    // Close any remaining brackets
    while (indentLevel > 0) {
        indentLevel--;
        lines.push('  '.repeat(indentLevel) + '<span class="code-bracket">}</span>');
    }
    
    return lines.join('\n');
}

/**
 * Analyze input message for styling cues
 */
function analyzeInputStyle(message) {
    const lowerMessage = message.toLowerCase();
    let bestMatch = null;
    let highestPriority = -1;
    let hasThanksKeyword = false;
    let hasNonThanksKeyword = false;
    
    // Find the most important keyword in current message (last one found) TODO make this based on hystory to find correct context to use..
    for (const [keyword, config] of Object.entries(STYLE_CONFIG)) {
        if (lowerMessage.includes(keyword)) {
            const index = lowerMessage.indexOf(keyword);
            
            // Track thanks vs non-thanks keywords
            if (config.formatType === 'thanks') {
                hasThanksKeyword = true;
            } else {
                hasNonThanksKeyword = true;
            }
            
            if (index > highestPriority) {
                highestPriority = index;
                bestMatch = { keyword, config, source: 'current' };
            }
        }
    }
    
    if (bestMatch) {
        // If we have both thanks and non-thanks keywords, ignore thanks
        if (bestMatch.config.formatType === 'thanks' && hasNonThanksKeyword) {
            let nonThanksMatch = null;
            let nonThanksPriority = -1;
            
            for (const [keyword, config] of Object.entries(STYLE_CONFIG)) {
                if (lowerMessage.includes(keyword) && config.formatType !== 'thanks') {
                    const index = lowerMessage.indexOf(keyword);
                    if (index > nonThanksPriority) {
                        nonThanksPriority = index;
                        nonThanksMatch = { keyword, config, source: 'current' };
                    }
                }
            }
            
            if (nonThanksMatch) {
                bestMatch = nonThanksMatch;
            }
        }
        
        // Check if it's an inherit keyword
        if (bestMatch.config.inheritPrevious) {
            const previousStyle = getPreviousMessageStyle();
            if (previousStyle) {
                return {
                    ...previousStyle,
                    wordCountMultiplier: (previousStyle.wordCountMultiplier || 1.0) * bestMatch.config.wordCountMultiplier
                };
            }
        }
        
        // Return 100% that style
        return bestMatch.config;
    }
    
    // Check ONLY last message (not current) for style keywords
    // This gives 50% chance to apply style from previous message
    const historyMatch = checkLastMessageForKeywords();
    if (historyMatch) {
        return historyMatch;
    }
    
    // No keywords found
    return {
        requireCodeblock: false,
        codeblockSize: null,
        wordCountMultiplier: 1.0,
        historyMultiplier: 0,
        formatType: 'text',
        happyMultiplier: 1.0
    };
}

/**
 * Get the style configuration from the previous user message
 */
function getPreviousMessageStyle() {
    // Return the last response style if we have it
    if (lastResponseStyle) {
        return lastResponseStyle;
    }
    
    if (messageHistory.length === 0) return null;
    
    // Fallback: Get the last message
    const lastMessage = messageHistory[messageHistory.length - 1];
    const lowerMsg = lastMessage.toLowerCase();
    
    // Find which keyword was used (prioritize non-inherit keywords)
    for (const [keyword, config] of Object.entries(STYLE_CONFIG)) {
        if (lowerMsg.includes(keyword) && !config.inheritPrevious) {
            return config;
        }
    }
    
    return null;
}

/**
 * Check only the last message for style keywords (50% chance to apply)
 */
function checkLastMessageForKeywords() {
    if (messageHistory.length === 0) return null;
    
    // Get only the last message
    const lastMessage = messageHistory[messageHistory.length - 1];
    const lowerMsg = lastMessage.toLowerCase();
    
    // Find if it has any style keyword
    for (const [keyword, config] of Object.entries(STYLE_CONFIG)) {
        if (lowerMsg.includes(keyword)) {
            // 50% chance to apply the style
            if (Math.random() < 0.5) {
                return {
                    requireCodeblock: config.requireCodeblock,
                    codeblockSize: config.codeblockSize,
                    wordCountMultiplier: config.wordCountMultiplier * 0.8,
                    historyMultiplier: config.historyMultiplier,
                    formatType: config.formatType,
                    happyMultiplier: config.happyMultiplier || 1.0
                };
            }
            // Only check first keyword found, then stop
            return null;
        }
    }
    
    return null;
}

/**
 * Calculate response word count based on input and chat history
 */
function calculateWordCount(inputMessage, styleConfig) {
    const baseMin = 20;
    const baseMax = 100;
    
    // Input length factor (longer input = longer response, but capped at 2x)
    const inputWords = inputMessage.trim().split(/\s+/).length;
    const inputFactor = 1 + Math.min(inputWords / 30, 1.0); // Max 2x from input length

    const styleMultiplier = styleConfig.wordCountMultiplier || 1.0;
    
    const chatFactor = 1 + (chatLengthMultiplier - 1) * 0.2;
    
    const totalMultiplier = inputFactor * styleMultiplier * chatFactor;
    
    const min = Math.floor(baseMin * totalMultiplier);
    const max = Math.floor(baseMax * totalMultiplier);
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Format words into structured text with punctuation and paragraphs
 */
function formatWordsAsText(words, formatType, isHappyEnding = false) {
    if (words.length === 0) return '';
    
    let formattedText = '';
    let wordIndex = 0;
    
    // Format based on type
    if (formatType === 'list') {
        const itemCount = Math.min(Math.floor(words.length / 5) + 3, 7);
        const wordsForList = Math.floor(words.length * 0.6); // 60% for list items
        const wordsBeforeList = Math.floor((words.length - wordsForList) * 0.5);
        const wordsAfterList = words.length - wordsForList - wordsBeforeList;
        
        // Text before list
        const beforeWords = words.slice(0, wordsBeforeList);
        if (beforeWords.length > 0) {
            beforeWords[0] = beforeWords[0].charAt(0).toUpperCase() + beforeWords[0].slice(1);
            formattedText += beforeWords.join(' ') + '.';
        }
        
        // Add TWO line breaks before list (one enter)
        formattedText += '\n\n';
        
        // List items
        const listWords = words.slice(wordsBeforeList, wordsBeforeList + wordsForList);
        const wordsPerItem = Math.floor(listWords.length / itemCount);
        
        for (let i = 0; i < itemCount; i++) {
            const itemWords = listWords.slice(i * wordsPerItem, (i + 1) * wordsPerItem);
            if (itemWords.length > 0) {
                formattedText += '  • ' + itemWords.join(' ') + '\n';
            }
        }
        
        // Add TWO line breaks after list (one enter)
        formattedText += '\n';
        
        // Text after list
        const afterWords = words.slice(wordsBeforeList + wordsForList);
        if (afterWords.length > 0) {
            afterWords[0] = afterWords[0].charAt(0).toUpperCase() + afterWords[0].slice(1);
            const ending = isHappyEnding ? HAPPY_ENDERS[Math.floor(Math.random() * HAPPY_ENDERS.length)] : '.';
            formattedText += afterWords.join(' ') + ending;
        }
        
        return formattedText.trim();
        
    } else if (formatType === 'steps') {
        // Create numbered steps with text before and after
        const stepCount = Math.min(Math.floor(words.length / 5) + 3, 7);
        const wordsForSteps = Math.floor(words.length * 0.6);
        const wordsBeforeSteps = Math.floor((words.length - wordsForSteps) * 0.5);
        const wordsAfterSteps = words.length - wordsForSteps - wordsBeforeSteps;
        
        // Text before steps
        const beforeWords = words.slice(0, wordsBeforeSteps);
        if (beforeWords.length > 0) {
            beforeWords[0] = beforeWords[0].charAt(0).toUpperCase() + beforeWords[0].slice(1);
            formattedText += beforeWords.join(' ') + '.';
        }
        
        formattedText += '\n\n';
        
        // Steps
        const stepWords = words.slice(wordsBeforeSteps, wordsBeforeSteps + wordsForSteps);
        const wordsPerStep = Math.floor(stepWords.length / stepCount);
        
        for (let i = 0; i < stepCount; i++) {
            const itemWords = stepWords.slice(i * wordsPerStep, (i + 1) * wordsPerStep);
            if (itemWords.length > 0) {
                formattedText += `  ${i + 1}. ` + itemWords.join(' ') + '\n';
            }
        }
        
        // Add TWO line breaks after steps (one enter)
        formattedText += '\n';
        
        // Text after steps
        const afterWords = words.slice(wordsBeforeSteps + wordsForSteps);
        if (afterWords.length > 0) {
            afterWords[0] = afterWords[0].charAt(0).toUpperCase() + afterWords[0].slice(1);
            const ending = isHappyEnding ? HAPPY_ENDERS[Math.floor(Math.random() * HAPPY_ENDERS.length)] : '.';
            formattedText += afterWords.join(' ') + ending;
        }
        
        return formattedText.trim();
        
    } else {
        // Regular text with punctuation and paragraphs
        const sentences = [];
        let currentSentence = [];
        
        for (let i = 0; i < words.length; i++) {
            currentSentence.push(words[i]);
            
            const sentenceLength = 4 + Math.floor(Math.random() * 9);
            
            if (currentSentence.length >= sentenceLength || i === words.length - 1) {
                currentSentence[0] = currentSentence[0].charAt(0).toUpperCase() + currentSentence[0].slice(1);
                
                let punctuation;
                if (i === words.length - 1 && isHappyEnding) {
                    punctuation = HAPPY_ENDERS[Math.floor(Math.random() * HAPPY_ENDERS.length)];
                } else {
                    punctuation = SENTENCE_ENDERS[Math.floor(Math.random() * SENTENCE_ENDERS.length)];
                }
                
                sentences.push(currentSentence.join(' ') + punctuation);
                currentSentence = [];
            }
        }
        
        // Group sentences into paragraphs (3-5 sentences per paragraph)
        const paragraphs = [];
        let currentParagraph = [];
        
        for (let i = 0; i < sentences.length; i++) {
            currentParagraph.push(sentences[i]);
            
            const paragraphLength = 3 + Math.floor(Math.random() * 3);
            
            if (currentParagraph.length >= paragraphLength || i === sentences.length - 1) {
                paragraphs.push(currentParagraph.join(' '));
                currentParagraph = [];
            }
        }
        
        return paragraphs.join('\n\n');
    }
}

/**
 * Generate complete glorp response
 */
function generateGlorpResponse(inputMessage) {
    messageCount++;
    chatLengthMultiplier = 1 + (messageCount * 0.05); // Slower growth: 5% per message
    
    // Store message in history
    messageHistory.push(inputMessage);
    if (messageHistory.length > 10) {
        messageHistory.shift(); // Keep only last 10 messages, TODO maybe based on bytes decided text length so we can still fit it in an URL
    }
    
    const styleConfig = analyzeInputStyle(inputMessage);
    
    lastResponseStyle = styleConfig;
    
    // Update happy ending multiplier if it's a thank message
    if (styleConfig.happyMultiplier && styleConfig.happyMultiplier > 1.0) {
        happyEndingMultiplier = Math.min(happyEndingMultiplier * styleConfig.happyMultiplier, 5.0);
    }
    
    // Calculate word count
    const wordCount = calculateWordCount(inputMessage, styleConfig);
    
    // Generate words
    const words = [];
    for (let i = 0; i < wordCount; i++) {
        words.push(generateNonsenseWord());
    }

    const shouldIncludeCode = styleConfig.requireCodeblock === true;
    
    // Check for happy ending (that's what she said)
    const isHappyEnding = happyEndingMultiplier > 1.2 || styleConfig.formatType === 'thanks';
    
    const formattedText = formatWordsAsText(words, styleConfig.formatType, isHappyEnding);
    
    let response = {
        text: formattedText,
        hasCodeblock: shouldIncludeCode,
        codeblock: null,
        codeblockPosition: null,
        formatType: styleConfig.formatType
    };
    
    if (shouldIncludeCode && styleConfig.codeblockSize) {
        const sizeConfig = CODEBLOCK_SIZES[styleConfig.codeblockSize];
        const lineCount = Math.floor(Math.random() * (sizeConfig.max - sizeConfig.min + 1)) + sizeConfig.min;
        
        response.codeblock = generateNonsenseCode(lineCount);
        
        // Position codeblock (30% at start, 40% in middle, 30% at end)
        const posRandom = Math.random();
        if (posRandom < 0.3) {
            response.codeblockPosition = 'start';
        } else if (posRandom < 0.7) {
            response.codeblockPosition = 'middle';
        } else {
            response.codeblockPosition = 'end';
        }
    }
    
    return response;
}

/**
 * Get typing delays for realistic effect
 */
function getTypingDelays(text, formatType) {
    // For lists and steps, we animate line by line
    if (formatType === 'list' || formatType === 'steps') {
        const lines = text.split('\n').filter(line => line.trim());
        const delays = [];
        
        for (let i = 0; i < lines.length; i++) {
            // Delay between lines
            delays.push(80 + Math.random() * 120);
        }
        
        return delays;
    }
    
    // For regular text, animate word by word
    const words = text.split(/\s+/);
    const delays = [];
    
    for (let i = 0; i < words.length; i++) {
        let delay = 30 + Math.random() * 50;
        
        if (Math.random() < 0.1) {
            delay = 200 + Math.random() * 300;
        }
        
        // Occasional longer pauses TODO, longer for thinking mode
        if (Math.random() < 0.03) {
            delay = 500 + Math.random() * 500;
        }
        
        delays.push(delay);
    }
    
    return delays;
}
