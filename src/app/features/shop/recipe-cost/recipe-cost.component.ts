import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
    MatButtonModule
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

  readonly displayedColumns: string[] = [
    'stockItemId',
    'name',
    'quantityUsed',
    'costPerUnit',
    'totalCost'
  ];

  readonly savedRecipeColumns: string[] = ['name', 'marginPercent', 'totalCost', 'suggestedPrice', 'createdAt', 'actions'];

  readonly ingredientSeeds: IngredientSeed[] = [
    { stockItemId: null, name: 'เชดด้าชีส', quantityUsed: 0.04, costPerUnit: 542 },
    { stockItemId: null, name: 'บรีชีส', quantityUsed: 0.03, costPerUnit: 1261 },
    { stockItemId: null, name: 'บลูชีส', quantityUsed: 0.04, costPerUnit: 915 },
    { stockItemId: null, name: 'กรานาพาดาโน่', quantityUsed: 0.04, costPerUnit: 1093 },
    { stockItemId: null, name: 'สโมคชีส', quantityUsed: 0.04, costPerUnit: 873 },
    { stockItemId: null, name: 'แอปเปิ้ล', quantityUsed: 0.5, costPerUnit: 20 },
    { stockItemId: null, name: 'สตอเบอรี่สด', quantityUsed: 0.03, costPerUnit: 200 },
    { stockItemId: null, name: 'เคบกู้สเบอรี่สด', quantityUsed: 0.06, costPerUnit: 100 },
    { stockItemId: null, name: 'บลูเบอรี่', quantityUsed: 0.03, costPerUnit: 200 },
    { stockItemId: null, name: 'องุ่น', quantityUsed: 0.08, costPerUnit: 100 },
    { stockItemId: null, name: 'น้ำผึ้ง', quantityUsed: 0.05, costPerUnit: 160 },
    { stockItemId: null, name: 'มะกอกดำ,เขียว', quantityUsed: 0.05, costPerUnit: 120 },
    { stockItemId: null, name: 'Salami', quantityUsed: 0.03, costPerUnit: 1500 },
    { stockItemId: null, name: 'Parma Ham', quantityUsed: 0.03, costPerUnit: 1500 },
    { stockItemId: null, name: 'Coppa', quantityUsed: 0.03, costPerUnit: 1500 },
    { stockItemId: null, name: 'C00k Ham', quantityUsed: 0.03, costPerUnit: 600 }
  ];

  readonly recipeForm = this.fb.group({
    recipeName: ['Cheese Board', [Validators.required]],
    recipeNo: [''],
    date: ['2024-01-20'],
    category: [''],
    portions: [1, [Validators.required, Validators.min(0.0001)]],
    preparedBy: ['อาร์ม'],
    ingredients: this.fb.array(this.ingredientSeeds.map((seed) => this.createIngredientGroup(seed))),
    qFactorPercent: [5, [Validators.required, Validators.min(0)]],
    marginPercent: [35, [Validators.required, Validators.min(0.0001)]],
    actualMenuPrice: [650, [Validators.required, Validators.min(0)]],
    discountPercent: [0, [Validators.required, Validators.min(0)]],
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
        stockItemId: ingredient?.stockItemId != null ? Number(ingredient.stockItemId) : null,
        name: String(ingredient?.name ?? '').trim(),
        quantityUsed: Number(ingredient?.quantityUsed ?? 0),
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
    } else {
      this.recipeService.createRecipe(this.shopId, payload);
    }

    this.saveSuccess = true;
    this.resetForm();
    setTimeout(() => {
      this.saveSuccess = false;
    }, 3000);
  }

  editRecipe(recipe: Recipe): void {
    this.editingRecipeId = recipe.id ?? null;

    this.recipeForm.patchValue({
      recipeName: recipe.name,
      marginPercent: recipe.marginPercent ?? 35
    });

    this.ingredientsFormArray.clear();
    for (const ingredient of recipe.ingredients ?? []) {
      const name = (ingredient.name ?? ingredient.ingredient ?? '').trim();
      const quantityUsed = Number(ingredient.quantityUsed ?? ingredient.recipeQty ?? 0);
      const costPerUnit = Number(
        ingredient.costPerUnit
          ?? (ingredient.eyPercent && ingredient.purchasedPrice
            ? (ingredient.purchasedPrice / ingredient.eyPercent) * 100
            : ingredient.purchasedPrice ?? 0)
      );

      this.ingredientsFormArray.push(
        this.createIngredientGroup({
          stockItemId: ingredient.stockItemId ?? null,
          name,
          quantityUsed,
          costPerUnit
        })
      );
    }

    this.recalculateAll();
  }

  resetForm(): void {
    this.editingRecipeId = null;
    this.recipeForm.patchValue({
      recipeName: 'Cheese Board',
      recipeNo: '',
      date: '2024-01-20',
      category: '',
      portions: 1,
      preparedBy: 'อาร์ม',
      qFactorPercent: 5,
      marginPercent: 35,
      actualMenuPrice: 650,
      discountPercent: 0
    });

    this.ingredientsFormArray.clear();
    for (const seed of this.ingredientSeeds) {
      this.ingredientsFormArray.push(this.createIngredientGroup(seed));
    }

    this.recalculateAll();
  }

  private createIngredientGroup(seed: IngredientSeed) {
    return this.fb.group({
      stockItemId: [seed.stockItemId],
      name: [seed.name, [Validators.required]],
      quantityUsed: [seed.quantityUsed, [Validators.required, Validators.min(0)]],
      costPerUnit: [seed.costPerUnit, [Validators.required, Validators.min(0)]],
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
