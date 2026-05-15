import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';

const GlobalLoadingBar = () => {
    const { isLoading } = useSelector((state) => state.app);
    // Also check other slices' isLoading if needed, or just rely on appSlice
    const billsLoading = useSelector((state) => state.bills.isLoading);
    const productsLoading = useSelector((state) => state.products.isLoading);
    const fabricLoading = useSelector((state) => state.fabricPurchases?.isLoading);

    const isGlobalLoading = isLoading || billsLoading || productsLoading || fabricLoading;

    return (
        <AnimatePresence>
            {isGlobalLoading && (
                <motion.div
                    initial={{ scaleX: 0, opacity: 0, originX: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                        duration: 0.5, 
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatType: "reverse"
                    }}
                    className="fixed top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 z-9999 shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                />
            )}
        </AnimatePresence>
    );
};

export default GlobalLoadingBar;
