import { backupAPI } from './api';
import { downloadBackupPDF } from '../utils/backupPdfGenerator';

export const backupService = {
    exportAllData: async () => {
        try {
            const response = await backupAPI.exportData();
            if (!response.success) {
                return { success: false, message: response.message || 'Export failed' };
            }

            const backupData = response.data;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `sriram_fashions_backup_${timestamp}.json`;

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return { success: true, message: 'Backup downloaded successfully' };
        } catch (error) {
            console.error('Backup error:', error);
            return { success: false, message: error.message || 'Backup failed' };
        }
    },

    exportPdfBackup: async (settings) => {
        try {
            const response = await backupAPI.exportData();
            if (!response.success) {
                return { success: false, message: response.message || 'Export failed' };
            }

            downloadBackupPDF(response.data, settings);
            return { success: true, message: 'PDF Backup downloaded successfully' };
        } catch (error) {
            console.error('PDF Backup error:', error);
            return { success: false, message: error.message || 'PDF Backup failed' };
        }
    },

    importData: async (jsonData) => {
        try {
            const response = await backupAPI.importData(jsonData);
            if (response.success) {
                return { success: true, message: 'Data restored successfully' };
            } else {
                return { success: false, message: response.message || 'Import failed' };
            }
        } catch (error) {
            console.error('Import error:', error);
            return { success: false, message: error.message || 'Import failed' };
        }
    },

    flashAllData: async () => {
        // For safety, we'll just return a message or implement a dedicated clear route
        return { success: false, message: 'Flash operation should be handled via database management tools for safety.' };
    }
};
