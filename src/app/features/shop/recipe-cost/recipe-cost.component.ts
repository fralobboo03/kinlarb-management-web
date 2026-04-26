import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
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
    MatNativeDateModule
  ],
  templateUrl: './recipe-cost.component.html',
  styleUrl: './recipe-cost.component.scss'
})
export class RecipeCostComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly recipeService = inject(RecipeService);

  shopId = 0;
  editingRecipeId: number | null = null;
  savedRecipes$: Observable<Recipe[]> = of([]);
  saveError = '';
  saveSuccess = false;
  successMessage = '';
  activeIngredientIndex = 0;

  readonly displayedColumns: string[] = [
    'name',
    'quantityUsed',
    'unit',
    'costPerUnit',
    'totalCost',
    'actions'
  ];

  readonly savedRecipeColumns: string[] = ['name', 'marginPercent', 'totalCost', 'suggestedPrice', 'createdAt', 'actions'];

  readonly recipeForm = this.fb.group({
    recipeName: ['', [Validators.required]],
    recipeNo: [''],
    date: [''],
    category: [''],
    portions: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    preparedBy: [''],
    ingredients: this.fb.array([this.createIngredientGroup()]),
    qFactorPercent: [null as number | null, [Validators.required, Validators.min(0)]],
    marginPercent: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    actualMenuPrice: [null as number | null, [Validators.required, Validators.min(0)]],
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
    this.route.parent?.paramMap.subscribe((params) => {
      this.shopId = Number(params.get('shopId'));
      this.savedRecipes$ = this.recipeService.getRecipesByShop(this.shopId);
    });

    this.recipeForm.valueChanges.subscribe(() => {
      this.recalculateAll();
    });

    this.recalculateAll();
  }

  saveRecipe(): void {
    this.saveError = '';
    this.saveSuccess = false;
    this.successMessage = '';

    if (this.recipeForm.invalid || this.shopId <= 0) {
      this.recipeForm.markAllAsTouched();
      return;
    }

    const raw = this.recipeForm.getRawValue();
    const recipeName = (raw.recipeName ?? '').trim();

    if (!recipeName) {
      this.saveError = 'กรุณาระบุชื่อสูตร';
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
      this.saveError = 'กรุณาระบุวัตถุดิบอย่างน้อย 1 รายการ';
      return;
    }

    const payload = {
      name: recipeName,
      marginPercent: Number(raw.marginPercent ?? 0),
      totalCost: Number(raw.recipeCost ?? 0),
      suggestedPrice: Number(raw.preliminarySellingPrice ?? 0),
      ingredients
    };

    if (this.editingRecipeId) {
      this.recipeService.updateRecipe(this.editingRecipeId, payload);
      this.successMessage = 'อัปเดตสูตรเรียบร้อย';
    } else {
      this.recipeService.createRecipe(this.shopId, payload);
      this.successMessage = 'บันทึกสูตรเรียบร้อย';
    }

    this.saveSuccess = true;
    this.resetForm();
    setTimeout(() => {
      this.saveSuccess = false;
    }, 3000);
  }

  editRecipe(recipe: Recipe): void {
    this.editingRecipeId = recipe.id ?? null;
    this.saveError = '';
    this.saveSuccess = false;
    this.successMessage = '';

    this.recipeForm.patchValue({
      recipeName: recipe.name,
      recipeNo: '',
      date: '',
      category: '',
      portions: 1,
      preparedBy: '',
      qFactorPercent: 0,
      marginPercent: recipe.marginPercent ?? null
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
        this.createIngredientGroup({
          name,
          quantityUsed,
          unit,
          costPerUnit
        })
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

    const deleted = this.recipeService.deleteRecipe(recipe.id);
    if (!deleted) {
      this.saveError = 'ไม่สามารถลบสูตรได้';
      return;
    }

    if (this.editingRecipeId === recipe.id) {
      this.resetForm();
    }

    this.saveError = '';
    this.successMessage = 'ลบสูตรเรียบร้อย';
    this.saveSuccess = true;

    setTimeout(() => {
      this.saveSuccess = false;
      this.successMessage = '';
    }, 3000);
  }

  resetForm(): void {
    this.editingRecipeId = null;
    this.recipeForm.patchValue({
      recipeName: '',
      recipeNo: '',
      date: '',
      category: '',
      portions: null,
      preparedBy: '',
      qFactorPercent: null,
      marginPercent: null,
      actualMenuPrice: null,
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
    const actualMenuPrice = Number(this.recipeForm.controls.actualMenuPrice.value ?? 0);
    const discountPercent = Number(this.recipeForm.controls.discountPercent.value ?? 0);

    const qFactorCost = totalIngredientsCost * (qFactorPercent / 100);
    const recipeCost = totalIngredientsCost + qFactorCost;

    // Excel I33: IF(I32=0,0,ROUND(I31/I32,2))
    const marginRatio = marginPercent / 100;
    const preliminarySellingPrice = marginRatio === 0 ? 0 : this.round(recipeCost / marginRatio, 2);

    // Excel I36: IF(I35=0,0,ROUND(I31/I35,2))
    const actualCostPercent = actualMenuPrice === 0 ? 0 : this.round(recipeCost / actualMenuPrice, 2);

    // Excel I38: ROUND(I35*H38%,2)
    const discountAmount = this.round(actualMenuPrice * (discountPercent / 100), 2);

    // Excel I39: IF(I38=0,0,ROUND((I31/(I35-I38))-(I31/I35),4))
    const discountResultsCostPercent =
      discountAmount === 0 || actualMenuPrice === 0 || actualMenuPrice === discountAmount
        ? 0
        : this.round((recipeCost / (actualMenuPrice - discountAmount)) - (recipeCost / actualMenuPrice), 4);

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
}
