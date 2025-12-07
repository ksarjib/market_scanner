export const generateSpeechText = (item, config) => {
    let text = `${item.company_name || item.symbol}. `; 
    
    // Standard Order: Signal -> Price -> Reason
    if (config.signal) {
        text += item.is_buy ? "Buy Signal. " : "Sell Signal. ";
    }
    
    if (config.price) {
        text += `at ${Math.round(item.price)} dollars. `;
    }

    if (config.reason && item.reason) {
        text += `${item.reason}`;
    }

    return text;
};

export const formatTime = (s) => {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};