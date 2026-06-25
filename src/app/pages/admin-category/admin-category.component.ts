import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { AdminCategoryService } from '../../services/admin-category.service';
import {
  AdminCategoryDto,
  CategoryForm,
  CategoryModalMode
} from '../../models/admin.models';

@Component({
  selector:    'app-admin-category',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './admin-category.component.html'
})
export class AdminCategoryComponent implements OnInit {

  // ── List data ─────────────────────────────────────────────────────────
  categories:    AdminCategoryDto[] = [];
  isListLoading  = false;
  listError      = '';

  // ── Filtering (client-side) ───────────────────────────────────────────
  searchText     = '';
  filterType     = '';   // '' | 'Income' | 'Expense'

  get filteredCategories(): AdminCategoryDto[] {
    const q = this.searchText.trim().toLowerCase();
    return this.categories.filter(c => {
      const matchName = !q || c.name.toLowerCase().includes(q);
      const matchType = !this.filterType || c.type === this.filterType;
      return matchName && matchType;
    });
  }

  // ── Modal state ───────────────────────────────────────────────────────
  modalMode:     CategoryModalMode = 'none';
  isSubmitting   = false;
  modalAlert     = '';
  modalAlertType: 'success' | 'error' = 'success';
  deleteTarget:  AdminCategoryDto | null = null;

  // ── Form model ────────────────────────────────────────────────────────
  form:    CategoryForm = this.emptyForm();
  touched  = false;

  readonly types = ['Income', 'Expense'];

  constructor(private svc: AdminCategoryService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  LOAD
  // ═══════════════════════════════════════════════════════════════════════

  loadCategories(): void {
    this.isListLoading = true;
    this.listError     = '';

    this.svc.getCategories().subscribe({
      next: (data) => {
        this.categories    = Array.isArray(data) ? data : [];
        this.isListLoading = false;
      },
      error: (err: Error) => {
        this.listError     = err.message;
        this.isListLoading = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════════════════════

  openCreateModal(): void {
    this.form       = this.emptyForm();
    this.touched    = false;
    this.modalAlert = '';
    this.modalMode  = 'create';
  }

  onCreateSave(): void {
    this.touched = true;
    if (!this.isFormValid()) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    this.svc.createCategory({
      name:      this.form.name.trim(),
      type:      this.form.type,
      icon:      this.form.icon.trim() || null,
      isDefault: this.form.isDefault
    }).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Category created successfully.';
        this.loadCategories();
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  EDIT
  // ═══════════════════════════════════════════════════════════════════════

  openEditModal(cat: AdminCategoryDto): void {
    this.form = {
      categoryId: cat.categoryId,
      name:       cat.name,
      type:       cat.type,
      icon:       cat.icon ?? '',
      isDefault:  cat.isDefault
    };
    this.touched    = false;
    this.modalAlert = '';
    this.modalMode  = 'edit';
  }

  onEditSave(): void {
    this.touched = true;
    if (!this.isFormValid()) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    this.svc.updateCategory(this.form.categoryId!, {
      name:      this.form.name.trim(),
      type:      this.form.type,
      icon:      this.form.icon.trim() || null,
      isDefault: this.form.isDefault
    }).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Category updated successfully.';
        this.loadCategories();
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  DELETE
  // ═══════════════════════════════════════════════════════════════════════

  openDeleteModal(cat: AdminCategoryDto): void {
    this.deleteTarget = cat;
    this.modalAlert   = '';
    this.isSubmitting = false;
    this.modalMode    = 'delete';
  }

  onDeleteConfirm(): void {
    if (!this.deleteTarget) return;
    this.isSubmitting = true;
    this.modalAlert   = '';

    this.svc.deleteCategory(this.deleteTarget.categoryId).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Category deleted successfully.';
        this.loadCategories();
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  closeModal(): void {
    this.modalMode    = 'none';
    this.modalAlert   = '';
    this.touched      = false;
    this.deleteTarget = null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  private isFormValid(): boolean {
    return this.form.name.trim().length > 0 && this.form.type.length > 0;
  }

  get nameInvalid(): boolean { return this.touched && this.form.name.trim().length === 0; }
  get typeInvalid(): boolean { return this.touched && this.form.type.length === 0; }

  // ═══════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  typeClass(type: string): string {
    return type === 'Income' ? 'income' : 'expense';
  }

  private emptyForm(): CategoryForm {
    return {
      categoryId: null,
      name:       '',
      type:       '',
      icon:       '',
      isDefault:  false
    };
  }
}
