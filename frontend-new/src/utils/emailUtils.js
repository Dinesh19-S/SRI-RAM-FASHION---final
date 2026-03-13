const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export const splitEmailRecipients = (value) => {
    if (Array.isArray(value)) {
        return value.flatMap((entry) => splitEmailRecipients(entry));
    }

    return String(value || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
};

export const normalizeEmailRecipients = (value) => {
    const recipients = splitEmailRecipients(value);
    return [...new Set(recipients.map((entry) => entry.toLowerCase()))];
};

export const getEmailRecipientValidation = (value) => {
    const recipients = normalizeEmailRecipients(value);
    const validRecipients = recipients.filter((entry) => EMAIL_PATTERN.test(entry));
    const invalidRecipients = recipients.filter((entry) => !EMAIL_PATTERN.test(entry));

    return {
        recipients,
        validRecipients,
        invalidRecipients,
        hasValidRecipients: validRecipients.length > 0
    };
};

export const isValidEmailRecipientList = (value) => {
    const { recipients, invalidRecipients } = getEmailRecipientValidation(value);
    return recipients.length > 0 && invalidRecipients.length === 0;
};

export const pickDefaultRecipient = (...sources) => {
    for (const source of sources) {
        const recipient = splitEmailRecipients(source).find((entry) => EMAIL_PATTERN.test(entry));
        if (recipient) {
            return recipient;
        }
    }

    return '';
};
