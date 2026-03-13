// Date formatting utilities

// Format date to dd/mm/yyyy
export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// Format date for input (yyyy-mm-dd)
export const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
};

// Parse dd/mm/yyyy to Date object
export const parseDate = (dateString) => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/');
    return new Date(year, month - 1, day);
};

// Get today's date in yyyy-mm-dd format
export const getTodayForInput = () => {
    return new Date().toISOString().split('T')[0];
};
