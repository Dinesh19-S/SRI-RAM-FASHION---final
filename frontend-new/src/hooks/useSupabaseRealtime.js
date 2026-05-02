import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '../services/supabase';
import { upsertBill, removeBill } from '../store/slices/billsSlice';
import { upsertProduct, removeProduct, upsertCategory } from '../store/slices/productsSlice';
import { setSyncStatus, setSyncError } from '../store/slices/appSlice';

/**
 * Custom hook to manage Supabase Realtime subscriptions and sync with Redux.
 * 
 * @returns {Object} { status, error }
 */
export const useSupabaseRealtime = () => {
    const dispatch = useDispatch();
    const [status, setStatus] = useState('connecting'); // 'connecting', 'connected', 'error', 'disconnected'
    const [error, setError] = useState(null);
    const channelRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        const setupSubscription = () => {
            // Clean up existing subscription if any
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }

            console.log('Setting up Supabase Realtime subscriptions...');

            const channel = supabase.channel('db-sync-global', {
                config: {
                    broadcast: { self: false },
                    presence: { key: 'sync' }
                }
            });

            channel
                // 1. Listen for Bills
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'bills' 
                }, (payload) => {
                    console.log('Real-time Bill Update:', payload);
                    if (payload.eventType === 'DELETE') {
                        dispatch(removeBill(payload.old.id));
                    } else {
                        // Ensure we have the full object with necessary ID fields
                        const bill = { ...payload.new, _id: payload.new.id };
                        dispatch(upsertBill(bill));
                    }
                })
                // 2. Listen for Products
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'products' 
                }, (payload) => {
                    console.log('Real-time Product Update:', payload);
                    if (payload.eventType === 'DELETE') {
                        dispatch(removeProduct(payload.old.id));
                    } else {
                        const product = { ...payload.new, _id: payload.new.id };
                        dispatch(upsertProduct(product));
                    }
                })
                // 3. Listen for Categories
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'categories' 
                }, (payload) => {
                    console.log('Real-time Category Update:', payload);
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const category = { ...payload.new, _id: payload.new.id };
                        dispatch(upsertCategory(category));
                    }
                })
                // Handle subscription status
                .subscribe(async (status) => {
                    if (!isMounted) return;
                    
                    console.log('Supabase Realtime Status:', status);
                    
                    if (status === 'SUBSCRIBED') {
                        setStatus('connected');
                        dispatch(setSyncStatus('connected'));
                        dispatch(setSyncError(null));
                        setError(null);
                    } else if (status === 'CLOSED') {
                        setStatus('disconnected');
                        dispatch(setSyncStatus('disconnected'));
                    } else if (status === 'CHANNEL_ERROR') {
                        setStatus('error');
                        dispatch(setSyncStatus('error'));
                        const msg = 'Failed to connect to real-time sync.';
                        dispatch(setSyncError(msg));
                        setError(msg);
                    }
                });

            channelRef.current = channel;
        };

        setupSubscription();

        // Handle auth state changes that might affect RLS
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                console.log('Auth state changed, re-subscribing to real-time...');
                setupSubscription();
            }
        });

        return () => {
            isMounted = false;
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            authSubscription.unsubscribe();
        };
    }, [dispatch]);

    return { status, error };
};

export default useSupabaseRealtime;
