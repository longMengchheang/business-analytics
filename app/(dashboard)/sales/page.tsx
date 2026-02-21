'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
  date: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface SaleFormData {
  id?: string;
  productId: string;
  quantity: string;
  date: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    startDate: '',
    endDate: '',
  });
  const [formData, setFormData] = useState<SaleFormData>({
    productId: '',
    quantity: '1',
    date: new Date().toISOString().split('T')[0],
  });

  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return categories.map((category) => ({ value: category, label: category }));
  }, [products]);

  const buildSalesUrl = () => {
    const params = new URLSearchParams({ limit: '50' });
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.category) params.set('category', filters.category);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    return `/api/sales?${params.toString()}`;
  };

  const fetchSales = async () => {
    try {
      const res = await fetch(buildSalesUrl(), { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch sales');
      }
      const data = await res.json();
      setSales(Array.isArray(data.sales) ? data.sales : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to fetch products');
      }
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  useEffect(() => {
    void fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.category, filters.startDate, filters.endDate]);

  const resetForm = () => {
    setFormData({
      productId: '',
      quantity: '1',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (sale: Sale) => {
    setFormData({
      id: sale.id,
      productId: sale.productId,
      quantity: String(sale.quantity),
      date: new Date(sale.date).toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQuantity = Number(formData.quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError('Quantity must be at least 1');
      return;
    }

    try {
      setSubmitting(true);
      const isEditing = Boolean(formData.id);
      const res = await fetch('/api/sales', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          productId: formData.productId,
          quantity: parsedQuantity,
          date: formData.date,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || (isEditing ? 'Failed to update sale' : 'Failed to create sale'));
      }

      setIsModalOpen(false);
      resetForm();
      await fetchSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm('Delete this sale record?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/sales?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete sale');
      }
      await fetchSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sale');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500">Record, search, filter, and manage your sales</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          New Sale
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Search Product"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Product name"
            />
            <Select
              label="Category"
              value={filters.category}
              onChange={(e: any) => setFilters({ ...filters, category: e.target.value })}
              options={[{ value: '', label: 'All categories' }, ...categoryOptions]}
            />
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Product</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Unit Price</TableHeader>
                  <TableHeader>Total</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{formatDate(sale.date)}</TableCell>
                    <TableCell className="font-medium">{sale.productName}</TableCell>
                    <TableCell>{sale.category || '-'}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>{formatCurrency(sale.unitPrice)}</TableCell>
                    <TableCell>{formatCurrency(sale.total)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(sale)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Edit sale"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(sale.id)}
                          className="p-1 hover:bg-red-50 rounded"
                          title="Delete sale"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No sales records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={formData.id ? 'Edit Sale' : 'New Sale'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Product"
            value={formData.productId}
            onChange={(e: any) => setFormData({ ...formData, productId: e.target.value })}
            options={[
              { value: '', label: 'Select a product' },
              ...products.map((p) => ({ value: p.id, label: `${p.name} - ${formatCurrency(p.price)}` })),
            ]}
            required
          />
          <Input
            label="Quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
          />
          <Input
            label="Sale Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {formData.id ? 'Update Sale' : 'Record Sale'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
