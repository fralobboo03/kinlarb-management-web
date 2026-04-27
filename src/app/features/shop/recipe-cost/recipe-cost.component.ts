import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Recipe } from '../models/recipe.model';
import { RecipeService } from '../services/recipe.service';

interface IngredientSeed {
  stockItemId: number | null;
  name: string;
  quantityUsed: number;
  costPerUnit: number;
}

@Component({
  selector: 'app-recipe-cost',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './recipe-cost.component.html',
  styleUrl: './recipe-cost.component.scss'
})
export class RecipeCostComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly recipeService = inject(RecipeService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly destroy$ = new Subject<void>();

  shopId = 0;
  editingRecipeId: number | null = null;
  savedRecipes$: Observable<Recipe[]> = of([]);
  isLoading = false;
  activeIngredientIndex = 0;

  readonly displayedColumns: string[] = [
    'name',
    'quantityUsed',
    'unit',
    'costPerUnit',
    'totalCost',
    'actions'
  ];

  readonly savedRecipeColumns: string[] = ['name', 'marginPercent', 'totalCost', 'suggestedPrice', 'actions'];

  readonly recipeForm = this.fb.group({
    recipeName: ['', [Validators.required]],
    recipeNo: [''],
    date: [new Date()],
    category: [''],
    portions: [null as number | null, [Validators.required, Validators.min(0)]],
    preparedBy: [''],
    ingredients: this.fb.array([this.createIngredientGroup()]),
    qFactorPercent: [null as number | null, [Validators.required, Validators.min(0)]],
    marginPercent: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    suggestedPrice: [null as number | null, [Validators.required, Validators.min(0)]],
    discountPercent: [null as number | null, [Validators.required, Validators.min(0)]],
    totalIngredientsCost: [{ value: 0, disabled: true }],
    qFactorCost: [{ value: 0, disabled: true }],
    recipeCost: [{ value: 0, disabled: true }],
    preliminarySellingPrice: [{ value: 0, disabled: true }],
    actualCostPercent: [{ value: 0, disabled: true }],
    discountAmount: [{ value: 0, disabled: true }],
    discountResultsCostPercent: [{ value: 0, disabled: true }]
  });

  get ingredientsFormArray(): FormArray {
    return this.recipeForm.controls.ingredients;
  }

  get ingredientRows(): AbstractControl[] {
    return [...this.ingredientsFormArray.controls];
  }

  onAnyInputChange(): void {
    this.recalculateAll();
  }

  ngOnInit(): void {
    this.route.parent?.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.shopId = Number(params.get('shopId'));
      this.loadRecipes();
    });

    this.recipeForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.recalculateAll();
    });

    this.recalculateAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRecipes(): void {
    this.savedRecipes$ = this.recipeService.recipes$;
    this.recipeService.getRecipesByShop(this.shopId).pipe(takeUntil(this.destroy$)).subscribe({
      error: (err) => this.showError('Failed to load recipes: ' + err.message)
    });
  }

  saveRecipe(): void {
    if (this.recipeForm.invalid || this.shopId <= 0) {
      this.recipeForm.markAllAsTouched();
      this.showError('ข้อมูลไม่ครบถ้วน');
      return;
    }

    const raw = this.recipeForm.getRawValue();
    const recipeName = (raw.recipeName ?? '').trim();

    if (!recipeName) {
      this.showError('กรุณาระบุชื่อสูตร');
      return;
    }

    const ingredients = (raw.ingredients ?? [])
      .map((ingredient) => ({
        stockItemId: null,
        name: String(ingredient?.name ?? '').trim(),
        quantityUsed: Number(ingredient?.quantityUsed ?? 0),
        unit: String(ingredient?.unit ?? '').trim(),
        costPerUnit: Number(ingredient?.costPerUnit ?? 0),
        totalCost: Number(ingredient?.totalCost ?? 0)
      }))
      .filter((ingredient) => ingredient.name.length > 0);

    if (ingredients.length === 0) {
      this.showError('กรุณาระบุวัตถุดิบอย่างน้อย 1 รายการ');
      return;
    }

    const payload = {
      name: recipeName,
      marginPercent: Number(raw.marginPercent ?? 0),
      totalCost: Number(raw.recipeCost ?? 0),
      suggestedPrice: Number(raw.preliminarySellingPrice ?? 0),
      recipeNo: raw.recipeNo ?? '',
      date: new Date(raw.date ?? ''),
      category: raw.category ?? '',
      portions: raw.portions ?? 0,
      preparedBy: raw.preparedBy ?? '',
      ingredients
    };

    this.isLoading = true;

    if (this.editingRecipeId) {
      this.recipeService.updateRecipe(this.editingRecipeId, payload)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.isLoading = false)
        )
        .subscribe({
          next: () => {
             this.showSuccess('อัปเดตสูตรสำเร็จ');
             this.resetForm();
             this.loadRecipes();
          },
          error: (err) => this.showError('ไม่สามารถอัปเดตสูตรได้: ' + err.message)
        });
    } else {
      this.recipeService.createRecipe(this.shopId, payload)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.isLoading = false)
        )
        .subscribe({
          next: () => {
             this.showSuccess('บันทึกสูตรสำเร็จ');
             this.resetForm();
          },
          error: (err) => this.showError('ไม่สามารถบันทึกสูตรได้: ' + err.message)
        });
    }
  }

  editRecipe(recipe: Recipe): void {
    if (!recipe.id) return;
    this.editingRecipeId = recipe.id;

    this.recipeForm.patchValue({
      recipeName: recipe.name,
      recipeNo: recipe.recipeNo ?? '',
      date: recipe.date,
      category: recipe.category ?? '',
      portions: recipe.portions ?? 0,
      preparedBy: recipe.preparedBy ?? '',
      qFactorPercent: 0,
      marginPercent: recipe.marginPercent ?? null,
      suggestedPrice: recipe.suggestedPrice ?? null,
      discountPercent: 0
    });

    this.ingredientsFormArray.clear();
    for (const ingredient of recipe.ingredients ?? []) {
      const name = (ingredient.name ?? ingredient.ingredient ?? '').trim();
      const quantityUsed = Number(ingredient.quantityUsed ?? ingredient.recipeQty ?? 0);
      const unit = String(ingredient.unit ?? ingredient.recipeUnit ?? ingredient.purchaseUnit ?? '').trim();
      const costPerUnit = Number(
        ingredient.costPerUnit
          ?? (ingredient.eyPercent && ingredient.purchasedPrice
            ? (ingredient.purchasedPrice / ingredient.eyPercent) * 100
            : ingredient.purchasedPrice ?? 0)
      );

      this.ingredientsFormArray.push(
        this.createIngredientGroup({ name, quantityUsed, unit, costPerUnit })
      );
    }

    if (this.ingredientsFormArray.length === 0) {
      this.addIngredient();
    }

    this.activeIngredientIndex = 0;
    this.recalculateAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteRecipe(recipe: Recipe): void {
    if (!recipe.id) {
      return;
    }

    const shouldDelete = confirm(`ยืนยันการลบสูตร "${recipe.name}" ?`);
    if (!shouldDelete) {
      return;
    }
    
    this.isLoading = true;
    this.recipeService.deleteRecipe(recipe.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: () => {
          this.showSuccess('ลบสูตรสำเร็จ');
          if (this.editingRecipeId === recipe.id) {
            this.resetForm();
          }
          this.loadRecipes();
        },
        error: (err) => this.showError('ไม่สามารถลบสูตรได้: ' + err.message)
      });
  }

  resetForm(): void {
    this.editingRecipeId = null;
    this.recipeForm.patchValue({
      recipeName: '',
      recipeNo: '',
      date: null,
      category: '',
      portions: null,
      preparedBy: '',
      qFactorPercent: null,
      marginPercent: null,
      suggestedPrice: null,
      discountPercent: null
    });

    this.ingredientsFormArray.clear();
    this.addIngredient();

    this.activeIngredientIndex = 0;
    this.recalculateAll();
  }

  addIngredient(): void {
    this.ingredientsFormArray.push(this.createIngredientGroup());
    this.activeIngredientIndex = this.ingredientsFormArray.length - 1;
    this.recalculateAll();
  }

  removeIngredient(index: number): void {
    if (this.ingredientsFormArray.length <= 1) {
      this.ingredientsFormArray.at(0).patchValue(
        {
          name: '',
          quantityUsed: 0,
          unit: '',
          costPerUnit: 0
        },
        { emitEvent: true }
      );
      this.activeIngredientIndex = 0;
      return;
    }

    this.ingredientsFormArray.removeAt(index);
    this.activeIngredientIndex = Math.max(0, Math.min(this.activeIngredientIndex, this.ingredientsFormArray.length - 1));
    this.recalculateAll();
  }

  setActiveIngredient(index: number): void {
    this.activeIngredientIndex = index;
  }

  private createIngredientGroup(seed?: Partial<IngredientSeed> & { unit?: string }) {
    return this.fb.group({
      stockItemId: [seed?.stockItemId ?? null],
      name: [seed?.name ?? '', [Validators.required]],
      quantityUsed: [seed?.quantityUsed ?? 0, [Validators.required, Validators.min(0)]],
      unit: [seed?.unit ?? ''],
      costPerUnit: [seed?.costPerUnit ?? 0, [Validators.required, Validators.min(0)]],
      totalCost: [{ value: 0, disabled: true }]
    });
  }

  private recalculateAll(): void {
    let totalIngredientsCost = 0;

    this.ingredientsFormArray.controls.forEach((group) => {
      const quantityUsed = Number(group.get('quantityUsed')?.value ?? 0);
      const costPerUnit = Number(group.get('costPerUnit')?.value ?? 0);

      const totalCost = quantityUsed * costPerUnit;
      const roundedTotalCost = this.round(totalCost, 2);

      group.get('totalCost')?.setValue(roundedTotalCost, { emitEvent: false });
      totalIngredientsCost += roundedTotalCost;
    });

    const qFactorPercent = Number(this.recipeForm.controls.qFactorPercent.value ?? 0);
    const marginPercent = Number(this.recipeForm.controls.marginPercent.value ?? 0);
    const suggestedPrice = Number(this.recipeForm.controls.suggestedPrice.value ?? 0);
    const discountPercent = Number(this.recipeForm.controls.discountPercent.value ?? 0);

    const qFactorCost = totalIngredientsCost * (qFactorPercent / 100);
    const recipeCost = totalIngredientsCost + qFactorCost;

    const marginRatio = marginPercent / 100;
    const preliminarySellingPrice = marginRatio === 0 ? 0 : this.round(recipeCost / marginRatio, 2);

    const actualCostPercent = suggestedPrice === 0 ? 0 : this.round(recipeCost / suggestedPrice, 2);

    const discountAmount = this.round(suggestedPrice * (discountPercent / 100), 2);

    const discountResultsCostPercent =
      discountAmount === 0 || suggestedPrice === 0 || suggestedPrice === discountAmount
        ? 0
        : this.round((recipeCost / (suggestedPrice - discountAmount)) - (recipeCost / suggestedPrice), 4);

    this.recipeForm.controls.totalIngredientsCost.setValue(this.round(totalIngredientsCost, 2), { emitEvent: false });
    this.recipeForm.controls.qFactorCost.setValue(this.round(qFactorCost, 2), { emitEvent: false });
    this.recipeForm.controls.recipeCost.setValue(this.round(recipeCost, 2), { emitEvent: false });
    this.recipeForm.controls.preliminarySellingPrice.setValue(preliminarySellingPrice, { emitEvent: false });
    this.recipeForm.controls.actualCostPercent.setValue(actualCostPercent, { emitEvent: false });
    this.recipeForm.controls.discountAmount.setValue(discountAmount, { emitEvent: false });
    this.recipeForm.controls.discountResultsCostPercent.setValue(discountResultsCostPercent, { emitEvent: false });
  }

  private round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
  }
}
