import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../store/slices/productsSlice';
import { FolderPlus, Search, Edit3, Trash2, X, CheckCircle2, Grid, Info, Tag, Package } from 'lucide-react';
import { useToast } from '../components/common';

const CategoryPage = () => {
    const toast = useToast();
    const dispatch = useDispatch();
    const { categories, isLoading } = useSelector((state) => state.products);

    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    useEffect(() => {
        dispatch(fetchCategories());
    }, [dispatch]);

    const handleOpenAddModal = () => {
        setModalMode('add');
        setFormData({ name: '', description: '' });
        setSelectedCategory(null);
        setShowModal(true);
    };

    const handleOpenEditModal = (category) => {
        setModalMode('edit');
        setFormData({
            name: category.name || '',
            description: category.description || ''
        });
        setSelectedCategory(category);
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.warning('Please enter a category name');
            return;
        }

        setIsSubmitting(true);
        try {
            if (modalMode === 'add') {
                await dispatch(createCategory({
                    name: formData.name.trim(),
                    description: formData.description.trim()
                })).unwrap();
                toast.success('Category created successfully');
            } else {
                await dispatch(updateCategory({
                    id: selectedCategory._id,
                    data: {
                        name: formData.name.trim(),
                        description: formData.description.trim()
                    }
                })).unwrap();
                toast.success('Category updated successfully');
            }

            setShowModal(false);
            setFormData({ name: '', description: '' });
            dispatch(fetchCategories());
        } catch (error) {
            toast.error(`Failed to ${modalMode} category: ` + (error || 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (category) => {
        setCategoryToDelete(category);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;
        
        setIsSubmitting(true);
        try {
            await dispatch(deleteCategory(categoryToDelete._id)).unwrap();
            toast.success(`Category ${categoryToDelete.name} deleted`);
            setShowDeleteConfirm(false);
            setCategoryToDelete(null);
        } catch (error) {
            toast.error('Failed to delete category: ' + (error || 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCategories = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return categories.filter(c => 
            (c.name || '').toLowerCase().includes(query) || 
            (c.description || '').toLowerCase().includes(query)
        );
    }, [categories, searchQuery]);

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Header */}
            <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-500">
                            <Grid size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Categories</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Categories</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Manage your product categories here.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            className="h-16 px-8 rounded-2xl flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95" 
                            onClick={handleOpenAddModal}
                        >
                            <FolderPlus size={20} />
                            Add Category
                        </button>
                    </div>
                </div>
            </div>

            {/* Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-card p-8 group hover:shadow-glow-blue border-none">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm group-hover:scale-110 transition-all duration-500">
                            <Grid size={24} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Categories</p>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{categories.length}</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2">Active Categories</p>
                    </div>
                </div>
                {/* Add more stats if needed */}
            </div>

            {/* Search & List */}
            <div className="glass-card p-10 border-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex flex-col lg:flex-row lg:items-end gap-8">
                    <div className="flex-1 space-y-3">
                        <label className="form-label">Search Categories</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-bold w-full" 
                                placeholder="Filter by name or description..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Categories Table */}
            <div className="page-table-card">
                <div className="p-10 pb-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Category List</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Manage All Categories</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100/50">
                        <span className="text-[10px] font-black uppercase tracking-widest">{filteredCategories.length} Categories</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th className="px-10 py-5">Category Name</th>
                                <th className="px-10 py-5">Description</th>
                                <th className="px-10 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="3" className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-10 py-32 text-center">
                                        <div className="w-24 h-24 bg-slate-50 rounded-4xl flex items-center justify-center mx-auto mb-8 border border-dashed border-slate-200">
                                            <Grid size={40} className="text-slate-300" />
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">No Categories Found</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Try searching for something else or add a new category.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map(c => (
                                    <tr key={c._id} className="group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-500 shadow-sm">
                                                    <Tag size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-base font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{c.name}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">ID: {c._id.slice(-6).toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <p className="text-sm font-bold text-slate-500 max-w-md truncate">{c.description || 'No description provided.'}</p>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex justify-end gap-3 opacity-70 group-hover:opacity-100 transition-all duration-300">
                                                <button
                                                    className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleOpenEditModal(c)}
                                                    title="Edit Category"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button
                                                    className="w-11 h-11 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleDeleteClick(c)}
                                                    title="Delete Category"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Category Form Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content max-w-xl border-none shadow-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-10 py-10 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                                    {modalMode === 'add' ? <FolderPlus size={32} /> : <Edit3 size={32} />}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                                        {modalMode === 'add' ? 'Add Category' : 'Edit Category'}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Category Details</p>
                                </div>
                            </div>
                            <button className="w-12 h-12 rounded-2xl hover:bg-white text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center" onClick={() => setShowModal(false)}><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="space-y-3">
                                <label className="form-label">Category Name *</label>
                                <input
                                    type="text"
                                    className="form-input font-black py-5 px-8"
                                    placeholder="e.g. Premium Silk Collection"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input font-bold min-h-[150px] py-5 px-8 resize-none"
                                    placeholder="Define the scope of this product group..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <button
                                className={`w-full py-7 rounded-3xl font-black uppercase tracking-[0.2em] text-xs text-white shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-4 ${
                                    modalMode === 'add' ? 'bg-slate-900 hover:bg-indigo-600 shadow-slate-900/10' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                                }`}
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {modalMode === 'add' ? <FolderPlus size={20} /> : <CheckCircle2 size={20} />}
                                {isSubmitting ? 'Saving...' : (modalMode === 'add' ? 'Add Category' : 'Update Category')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && categoryToDelete && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content max-w-md border-none shadow-3xl bg-white" onClick={(e) => e.stopPropagation()}>
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-red-100 shadow-2xl shadow-red-500/10">
                                <Trash2 size={44} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Delete Category?</h3>
                            <p className="text-[11px] font-black text-slate-400 mb-12 leading-relaxed uppercase tracking-[0.2em] px-4">
                                You are about to permanently delete <span className="text-red-500">{categoryToDelete.name}</span>. This action cannot be undone.
                            </p>
                            <div className="grid grid-cols-2 gap-6">
                                <button className="btn btn-secondary py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] border-none bg-slate-100 hover:bg-slate-200 transition-all" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className="btn bg-red-600 text-white hover:bg-red-500 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-red-600/20 transition-all active:scale-95" onClick={handleConfirmDelete} disabled={isSubmitting}>
                                    {isSubmitting ? 'Deleting...' : 'Delete Category'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
