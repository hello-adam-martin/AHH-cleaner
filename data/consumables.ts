import type { ConsumableCategory, ConsumableItem } from '@/types';

export const consumableCategories: ConsumableCategory[] = [
  {
    id: 'linen',
    name: 'Linen',
    order: 1,
  },
  {
    id: 'towels',
    name: 'Towels',
    order: 2,
  },
  {
    id: 'toiletries',
    name: 'Toiletries',
    order: 3,
  },
  {
    id: 'kitchen',
    name: 'Kitchen Supplies',
    order: 4,
  },
];

// TODO: Update these prices with your actual consumable costs
export const consumableItems: ConsumableItem[] = [
  // Linen
  {
    id: 'king_sheets',
    category: 'linen',
    name: 'King Sheets',
    order: 1,
    price: 5.00, // TODO: Update with actual price
  },
  {
    id: 'queen_sheets',
    category: 'linen',
    name: 'Queen Sheets',
    order: 2,
    price: 4.50, // TODO: Update with actual price
  },
  {
    id: 'single_sheets',
    category: 'linen',
    name: 'Single Sheets',
    order: 3,
    price: 3.50, // TODO: Update with actual price
  },
  {
    id: 'pillowcases',
    category: 'linen',
    name: 'Pillowcases',
    order: 4,
    price: 1.00, // TODO: Update with actual price
  },
  {
    id: 'duvet_covers',
    category: 'linen',
    name: 'Duvet Covers',
    order: 5,
    price: 4.00, // TODO: Update with actual price
  },
  // Towels
  {
    id: 'bath_towels',
    category: 'towels',
    name: 'Bath Towels',
    order: 1,
    price: 2.50, // TODO: Update with actual price
  },
  {
    id: 'hand_towels',
    category: 'towels',
    name: 'Hand Towels',
    order: 2,
    price: 1.50, // TODO: Update with actual price
  },
  {
    id: 'face_cloths',
    category: 'towels',
    name: 'Face Cloths',
    order: 3,
    price: 0.75, // TODO: Update with actual price
  },
  {
    id: 'bath_mats',
    category: 'towels',
    name: 'Bath Mats',
    order: 4,
    price: 2.00, // TODO: Update with actual price
  },
  // Toiletries
  {
    id: 'toilet_paper',
    category: 'toiletries',
    name: 'Toilet Paper',
    order: 1,
    price: 0.50, // TODO: Update with actual price
  },
  {
    id: 'hand_soap',
    category: 'toiletries',
    name: 'Hand Soap',
    order: 2,
    price: 1.25, // TODO: Update with actual price
  },
  {
    id: 'body_wash',
    category: 'toiletries',
    name: 'Body Wash',
    order: 3,
    price: 1.50, // TODO: Update with actual price
  },
  {
    id: 'shampoo',
    category: 'toiletries',
    name: 'Shampoo',
    order: 4,
    price: 1.50, // TODO: Update with actual price
  },
  {
    id: 'conditioner',
    category: 'toiletries',
    name: 'Conditioner',
    order: 5,
    price: 1.50, // TODO: Update with actual price
  },
  // Kitchen Supplies
  {
    id: 'coffee',
    category: 'kitchen',
    name: 'Coffee',
    order: 1,
    price: 2.00, // TODO: Update with actual price
  },
  {
    id: 'tea',
    category: 'kitchen',
    name: 'Tea',
    order: 2,
    price: 1.50, // TODO: Update with actual price
  },
  {
    id: 'sugar',
    category: 'kitchen',
    name: 'Sugar',
    order: 3,
    price: 1.00, // TODO: Update with actual price
  },
  {
    id: 'milk',
    category: 'kitchen',
    name: 'Milk',
    order: 4,
    price: 2.50, // TODO: Update with actual price
  },
  {
    id: 'dishwashing_liquid',
    category: 'kitchen',
    name: 'Dishwashing Liquid',
    order: 5,
    price: 2.00, // TODO: Update with actual price
  },
];

// Helper to get items by category
export const getItemsByCategory = (categoryId: string): ConsumableItem[] => {
  return consumableItems
    .filter((item) => item.category === categoryId)
    .sort((a, b) => a.order - b.order);
};

// Helper to get all categories with their items
export const getCategoriesWithItems = () => {
  return consumableCategories
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      ...category,
      items: getItemsByCategory(category.id),
    }));
};

// Helper to calculate total cost from consumables
export const calculateConsumablesTotalCost = (consumables: { [key: string]: number }): number => {
  let total = 0;

  Object.entries(consumables).forEach(([itemId, quantity]) => {
    if (quantity > 0) {
      const item = consumableItems.find((i) => i.id === itemId);
      if (item) {
        total += item.price * quantity;
      }
    }
  });

  return total;
};
