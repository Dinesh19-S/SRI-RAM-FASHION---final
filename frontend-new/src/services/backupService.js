import { supabase } from './supabase';

export const backupService = {
    exportAllData: async () => {
        try {
            const tables = [
                'customers',
                'suppliers',
                'categories',
                'products',
                'hsn_codes',
                'bills',
                'bill_items',
                'purchase_entries',
                'purchase_items',
                'stock_movements',
                'settings'
            ];

            const backupData = {};

            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*');
                if (error) {
                    console.error(`Error backing up table ${table}:`, error);
                    continue;
                }
                backupData[table] = data;
            }

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `sriram_fashions_backup_${timestamp}.json`;

            // Create blob and download
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
            return { success: false, message: error.message };
        }
    },

    flashAllData: async () => {
        try {
            const tables = [
                'bill_items',
                'purchase_items',
                'stock_movements',
                'bills',
                'purchase_entries',
                'products',
                'categories',
                'customers',
                'suppliers',
                'hsn_codes'
            ];

            for (const table of tables) {
                // Delete all rows where id is not null (effectively all rows)
                const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (error) {
                    console.error(`Error flashing table ${table}:`, error);
                }
            }

            return { success: true, message: 'All data has been cleared successfully' };
        } catch (error) {
            console.error('Flash error:', error);
            return { success: false, message: error.message };
        }
    },

    importData: async (jsonData) => {
        try {
            const tables = [
                'hsn_codes',
                'customers',
                'suppliers',
                'categories',
                'products',
                'bills',
                'bill_items',
                'purchase_entries',
                'purchase_items',
                'stock_movements',
                'settings'
            ];

            for (const table of tables) {
                const data = jsonData[table];
                if (data && Array.isArray(data) && data.length > 0) {
                    // Upsert data to avoid duplicates if some IDs already exist
                    const { error } = await supabase.from(table).upsert(data);
                    if (error) {
                        console.error(`Error importing table ${table}:`, error);
                    }
                }
            }

            return { success: true, message: 'Data restored successfully' };
        } catch (error) {
            console.error('Import error:', error);
            return { success: false, message: error.message };
        }
    }
};
