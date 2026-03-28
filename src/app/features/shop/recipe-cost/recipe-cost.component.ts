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
  purchasedPrice: number;
  purchaseUnit: string;
  ingredient: string;
  eyPercent: number;
  recipeQty: number;
  recipeUnit: string;
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
  savedRecipes$: Observable<Recipe[]> = of([]);
  saveError = '';
  saveSuccess = false;

  readonly displayedColumns: string[] = [
    'purchasedPrice',
    'purchaseUnit',
    'ingredient',
    'eyPercent',
    'recipeQty',
    'recipeUnit',
    'individualCost'
  ];

  readonly savedRecipeColumns: string[] = ['name', 'totalCost', 'suggestedPrice', 'createdAt'];

  readonly ingredientSeeds: IngredientSeed[] = [
    { purchasedPrice: 542, purchaseUnit: 'กก', ingredient: 'เชดด้าชีส', eyPercent: 100, recipeQty: 0.04, recipeUnit: 'กก' },
    { purchasedPrice: 1261, purchaseUnit: 'กก', ingredient: 'บรีชีส', eyPercent: 100, recipeQty: 0.03, recipeUnit: 'กก' },
    { purchasedPrice: 915, purchaseUnit: 'กก', ingredient: 'บลูชีส', eyPercent: 100, recipeQty: 0.04, recipeUnit: 'กก' },
    { purchasedPrice: 1093, purchaseUnit: 'กก', ingredient: 'กรานาพาดาโน่', eyPercent: 100, recipeQty: 0.04, recipeUnit: 'กก' },
    { purchasedPrice: 873, purchaseUnit: 'กก', ingredient: 'สโมคชีส', eyPercent: 100, recipeQty: 0.04, recipeUnit: 'กก' },
    { purchasedPrice: 20, purchaseUnit: 'ลูก', ingredient: 'แอปเปิ้ล', eyPercent: 100, recipeQty: 0.5, recipeUnit: 'กก' },
    { purchasedPrice: 200, purchaseUnit: 'กก', ingredient: 'สตอเบอรี่สด', eyPercent: 100, recipeQty: 0.03, recipeUnit: 'กก' },
    { purchasedPrice: 100, purchaseUnit: 'กก', ingredient: 'เคบกู้สเบอรี่สด', eyPercent: 100, recipeQty: 0.06, recipeUnit: 'กก' },
    { purchasedPrice: 200, purchaseUnit: 'กก', ingredient: 'บลูเบอรี่', eyPercent: 100, recipeQty: 0.03, recipeUnit: 'กก' },
    { purchasedPrice: 100, purchaseUnit: 'กก', ingredient: 'องุ่น', eyPercent: 100, recipeQty: 0.08, recipeUnit: 'กก' },
    { purchasedPrice: 160, purchaseUnit: 'กก', ingredient: 'น้ำผึ้ง', eyPercent: 100, recipeQty: 0.05, recipeUnit: 'กก' },
    { purchasedPrice: 120, purchaseUnit: 'กก', ingredient: 'มะกอกดำ,เขียว', eyPercent: 100, recipeQty: 0.05, recipeUnit: 'กก' },
    { purchasedPrice: 1500, purchaseUnit: 'กก', ingredient: 'Salami', eyPercent: 100, recipeQty: 0.03, recipeUnit: 'กก' },
    { purchasedPrice: 1500, purchaseUnit: 'กก', ingredient: 'Parma Ham', eyPercent: 100, recipeQty: 0.03, recipeUnit: 'กก' },
    { purchasedPrice: 1500, purchaseUnit: 'กก', ingredient: 'Coppa', eyPercent: 100, recipeQty: 0.03, recipeUnit: 'กก' },
    { purchasedPrice: 600, purchaseUnit: 'กก', ingredient: 'C00k Ham', eyPercent: 100, recipeQty: 0.03, recipeUnit: 'กก' }
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
    desiredCostPercent: [0.35, [Validators.required, Validators.min(0)]],
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
        purchasedPrice: Number(ingredient?.purchasedPrice ?? 0),
        purchaseUnit: String(ingredient?.purchaseUnit ?? '').trim(),
        ingredient: String(ingredient?.ingredient ?? '').trim(),
        eyPercent: Number(ingredient?.eyPercent ?? 0),
        recipeQty: Number(ingredient?.recipeQty ?? 0),
        recipeUnit: String(ingredient?.recipeUnit ?? '').trim(),
        individualCost: Number(ingredient?.individualCost ?? 0)
      }))
      .filter((ingredient) => ingredient.ingredient.length > 0);

    if (ingredients.length === 0) {
      this.saveError = 'กรุณาระบุวัตถุดิบอย่างน้อย 1 รายการ';
      return;
    }

    this.recipeService.createRecipe(this.shopId, {
      name: recipeName,
      totalCost: Number(raw.recipeCost ?? 0),
      suggestedPrice: Number(raw.preliminarySellingPrice ?? 0),
      ingredients
    });

    this.saveSuccess = true;
    setTimeout(() => {
      this.saveSuccess = false;
    }, 3000);
  }

  private createIngredientGroup(seed: IngredientSeed) {
    return this.fb.group({
      purchasedPrice: [seed.purchasedPrice, [Validators.required, Validators.min(0)]],
      purchaseUnit: [seed.purchaseUnit],
      ingredient: [seed.ingredient, [Validators.required]],
      eyPercent: [seed.eyPercent, [Validators.required, Validators.min(0.0001)]],
      recipeQty: [seed.recipeQty, [Validators.required, Validators.min(0)]],
      recipeUnit: [seed.recipeUnit],
      individualCost: [{ value: 0, disabled: true }]
    });
  }

  private recalculateAll(): void {
    let totalIngredientsCost = 0;

    this.ingredientsFormArray.controls.forEach((group) => {
      const purchasedPrice = Number(group.get('purchasedPrice')?.value ?? 0);
      const eyPercent = Number(group.get('eyPercent')?.value ?? 0);
      const recipeQty = Number(group.get('recipeQty')?.value ?? 0);

      const individualCost = eyPercent === 0 ? 0 : (purchasedPrice / eyPercent) * 100 * recipeQty;
      const roundedIndividualCost = this.round(individualCost, 2);

      group.get('individualCost')?.setValue(roundedIndividualCost, { emitEvent: false });
      totalIngredientsCost += roundedIndividualCost;
    });

    const qFactorPercent = Number(this.recipeForm.controls.qFactorPercent.value ?? 0);
    const desiredCostPercent = Number(this.recipeForm.controls.desiredCostPercent.value ?? 0);
    const actualMenuPrice = Number(this.recipeForm.controls.actualMenuPrice.value ?? 0);
    const discountPercent = Number(this.recipeForm.controls.discountPercent.value ?? 0);

    const qFactorCost = totalIngredientsCost * (qFactorPercent / 100);
    const recipeCost = totalIngredientsCost + qFactorCost;

    // Excel I33: IF(I32=0,0,ROUND(I31/I32,2))
    const preliminarySellingPrice = desiredCostPercent === 0 ? 0 : this.round(recipeCost / desiredCostPercent, 2);

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
