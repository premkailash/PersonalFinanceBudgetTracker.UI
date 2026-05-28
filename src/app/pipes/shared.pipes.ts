import { Pipe, PipeTransform } from '@angular/core';
import { CategoryDto } from '../models/budget.models';
import { AccountResponseDto } from '../models/account.models';

/** Filters a category list by Type ('Income' | 'Expense') for optgroup rendering */
@Pipe({ name: 'catFilter', standalone: true, pure: true })
export class CatFilterPipe implements PipeTransform {
  transform(categories: CategoryDto[], type: string): CategoryDto[] {
    if (!categories) return [];
    return categories.filter(c => c.type === type);
  }
}

/** Resolves an accountId to an account name from an account array */
@Pipe({ name: 'accountName', standalone: true, pure: true })
export class AccountNamePipe implements PipeTransform {
  transform(accounts: AccountResponseDto[], accountId: number): string {
    return accounts.find(a => a.accountId === accountId)?.accountName ?? '—';
  }
}
