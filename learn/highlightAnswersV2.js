(() => {
    const CONFIG = {
        autoClickMCQ: true,               // idek how long this took ---
        autoTypeWritten: true,    
        actionDelay: 400          
    };

    function findQuestionInFiber(fiber) {
        let current = fiber;
        while (current) {
            if (current.memoizedProps?.question) return current.memoizedProps.question;
            if (current.memoizedProps?.word && current.memoizedProps?.definition) {
                return { type: 'Flashcard', metadata: current.memoizedProps };
            }
            current = current.return;
        }
        return null;
    }

    function setInputAndNotifyReact(inputField, text) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        const setter = inputField.tagName === 'TEXTAREA' ? nativeTextAreaValueSetter : nativeInputValueSetter;
        
        setter.call(inputField, text);
        
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
        });
        inputField.dispatchEvent(inputEvent);
    }

    function processQuizletCard() {
        const element = document.querySelector('article') || document.querySelector('.FlashcardCard');
        if (!element) return;

        const fiberKey = Object.keys(element).find(k => k.startsWith('__reactFiber$'));
        if (!fiberKey) return;

        const question = findQuestionInFiber(element[fiberKey]);
        if (!question) return;

        if (question.type === 'MultipleChoiceQuestion') {
            const options = question.metadata?.optionGenerationSource;
            if (!options) return;

            const answerIndex = options.findIndex(k => k === 'key');
            const answersContainer = document.querySelector('[data-testid="MCQ Answers"]');
            
            if (answersContainer && answersContainer.children[answerIndex]) {
                const answerElement = answersContainer.children[answerIndex];
                
                answerElement.style.border = '3px solid lime';

                if (CONFIG.autoClickMCQ && !answerElement.dataset.autoClicked) {
                    answerElement.dataset.autoClicked = 'true';
                    
                    setTimeout(() => {
                        const innerTarget = answerElement.querySelector('section, [role="button"], button') 
                                            || answerElement.querySelector(':first-child') 
                                            || answerElement;
                        
                        const opts = { bubbles: true, cancelable: true, view: window };
                        
                        innerTarget.dispatchEvent(new MouseEvent('pointerdown', opts));
                        innerTarget.dispatchEvent(new MouseEvent('mousedown', opts));
                        innerTarget.dispatchEvent(new MouseEvent('pointerup', opts));
                        innerTarget.dispatchEvent(new MouseEvent('mouseup', opts));
                        innerTarget.click();
                        
                        if (innerTarget !== answerElement) { // this is something ---
                            answerElement.dispatchEvent(new MouseEvent('mousedown', opts));
                            answerElement.click();
                            answerElement.dispatchEvent(new MouseEvent('mouseup', opts));
                        }
                    }, CONFIG.actionDelay);
                }
            }
        } 
        else if (question.type === 'WrittenQuestion') {
            try {
                const allCards = window.__NEXT_DATA__?.props?.pageProps?.studyModesCommon?.studiableDocumentData?.studiableItems;
                if (!allCards) return;

                const card = allCards.find(c => c.id === question.metadata.studiableItemId);
                if (!card) return;

                const isDefinition = question.metadata.answerSide === 'definition';
                const answerTextString = card.cardSides[isDefinition ? 1 : 0]?.media?.[0]?.plainText;

                if (!answerTextString) return;
                
                injectAnswerOverlay(answerTextString);

                const inputField = document.querySelector('textarea, input[type="text"]');
                const form = document.querySelector('form');
                
                if (CONFIG.autoTypeWritten && inputField && !inputField.dataset.autoTyped) {
                    inputField.dataset.autoTyped = 'true';
                    
                    setTimeout(() => {
                        setInputAndNotifyReact(inputField, answerTextString);
                        
                        setTimeout(() => {
                            if (form) {
                                const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
                                if (submitBtn) {
                                    submitBtn.click();
                                } else {
                                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                                }
                            }
                        }, 250);
                    }, CONFIG.actionDelay);
                }

            } catch (err) {
                console.error("Error executing written helper:", err);
            }
        }
        else if (question.type === 'Flashcard') {
            const answerTextString = question.metadata.definition;
            if (answerTextString) {
                injectAnswerOverlay(`Peek: ${answerTextString}`, '.FlashcardCard');
            }
        }
    }

    function injectAnswerOverlay(text, fallbackSelector = 'form') {
        let existing = document.querySelector('#x-answer');
        if (existing) {
            existing.innerText = text;
            return;
        }

        const target = document.querySelector(fallbackSelector);
        if (!target?.parentElement) return;

        const uiBox = document.createElement('div');
        uiBox.id = 'x-answer';
        uiBox.style.cssText = 'color: #00ff00; background: rgba(0,0,0,0.05); padding: 10px; margin: 10px 0; border-radius: 8px; border-left: 4px solid lime; font-weight: bold; font-family: monospace;';
        uiBox.innerText = text;
        
        target.parentElement.insertBefore(uiBox, target);
    }

    const observer = new MutationObserver(() => {
        observer.disconnect();
        processQuizletCard();
        observer.observe(document.body, { childList: true, subtree: true });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    processQuizletCard();
    console.log("creds mashiru <3.");
})();
