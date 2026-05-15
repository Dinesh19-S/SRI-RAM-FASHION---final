import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import socket from '../services/socket';
import { upsertBill, removeBill, fetchBills } from '../store/slices/billsSlice';
import { upsertProduct, removeProduct, fetchProducts } from '../store/slices/productsSlice';

/**
 * Custom hook to handle real-time data synchronization via Socket.io
 * Listens for events from the backend and updates the Redux store accordingly.
 */
const useSocketSync = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        if (!socket) return;

        // --- Bill Sync ---
        socket.on('bill:created', (payload) => {
            console.log('[Sync] New bill received:', payload.data?.billNumber);
            if (payload.data) {
                dispatch(upsertBill(payload.data));
            }
        });

        socket.on('bill:updated', (payload) => {
            console.log('[Sync] Bill updated:', payload.id);
            if (payload.data) {
                dispatch(upsertBill(payload.data));
            }
        });

        socket.on('bill:deleted', (payload) => {
            console.log('[Sync] Bill deleted:', payload.id);
            dispatch(removeBill(payload.id));
        });

        // --- Product Sync ---
        socket.on('product:created', (payload) => {
            console.log('[Sync] New product received:', payload.data?.name);
            if (payload.data) {
                dispatch(upsertProduct(payload.data));
            }
        });

        socket.on('product:updated', (payload) => {
            console.log('[Sync] Product updated:', payload.id || payload.data?._id);
            if (payload.data) {
                dispatch(upsertProduct(payload.data));
            } else if (payload.multi) {
                // If many products changed (e.g., after a purchase), refetch the list
                dispatch(fetchProducts());
            }
        });

        socket.on('product:deleted', (payload) => {
            console.log('[Sync] Product deleted:', payload.id);
            dispatch(removeProduct(payload.id));
        });

        // --- Category Sync ---
        socket.on('category:created', (payload) => {
            console.log('[Sync] New category received:', payload.data?.name);
            if (payload.data) {
                dispatch(upsertCategory(payload.data));
            }
        });

        socket.on('category:updated', (payload) => {
            console.log('[Sync] Category updated:', payload.id);
            if (payload.data) {
                dispatch(upsertCategory(payload.data));
            }
        });

        socket.on('category:deleted', (payload) => {
            console.log('[Sync] Category deleted:', payload.id);
            // We don't have a removeCategory action in the slice yet, but we can refetch
            dispatch(fetchProducts()); 
        });

        // --- Customer Sync ---
        socket.on('customer:created', (payload) => {
            console.log('[Sync] New customer received:', payload.data?.name);
            // We don't have a customer slice yet, but this prepares for it
        });

        socket.on('customer:updated', (payload) => {
            console.log('[Sync] Customer updated:', payload.id);
        });

        // --- Supplier Sync ---
        socket.on('supplier:created', (payload) => {
            console.log('[Sync] New supplier received:', payload.data?.name);
        });

        socket.on('supplier:updated', (payload) => {
            console.log('[Sync] Supplier updated:', payload.id);
        });

        // --- Purchase Sync ---
        socket.on('purchase:created', (payload) => {
            console.log('[Sync] New purchase entry received');
            // Purchase entries often affect bills and products, so we refresh bills too
            dispatch(fetchBills());
        });

        socket.on('purchase:updated', (payload) => {
            dispatch(fetchBills());
        });

        socket.on('purchase:deleted', (payload) => {
            dispatch(fetchBills());
        });

        // --- Category Sync ---
        socket.on('category:created', () => dispatch(fetchProducts()));
        socket.on('category:updated', () => dispatch(fetchProducts()));
        socket.on('category:deleted', () => dispatch(fetchProducts()));

        // --- Customer Sync ---
        socket.on('customer:created', () => { /* Future: dispatch(fetchCustomers()) */ });
        socket.on('customer:updated', () => { /* Future: dispatch(fetchCustomers()) */ });

        // --- Supplier Sync ---
        socket.on('supplier:created', () => { /* Future: dispatch(fetchSuppliers()) */ });
        socket.on('supplier:updated', () => { /* Future: dispatch(fetchSuppliers()) */ });

        // Clean up listeners on unmount
        return () => {
            socket.off('bill:created');
            socket.off('bill:updated');
            socket.off('bill:deleted');
            socket.off('product:created');
            socket.off('product:updated');
            socket.off('product:deleted');
            socket.off('purchase:created');
            socket.off('purchase:updated');
            socket.off('purchase:deleted');
            socket.off('category:created');
            socket.off('category:updated');
            socket.off('category:deleted');
            socket.off('customer:created');
            socket.off('customer:updated');
            socket.off('supplier:created');
            socket.off('supplier:updated');
        };
    }, [dispatch]);

    return socket;
};

export default useSocketSync;
