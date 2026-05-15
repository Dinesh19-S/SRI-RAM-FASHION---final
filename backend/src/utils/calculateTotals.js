export const calculateTotals = (items) => {
  let total_rolls = items.length;
  let total_weight = 0;
  let total_amount = 0;

  items.forEach((item) => {
    // Ensure numbers
    const weight = parseFloat(item.weight_kg) || 0;
    const rate = parseFloat(item.rate_per_kg) || 0;
    
    // Calculate individual item amount
    item.amount = weight * rate;
    
    total_weight += weight;
    total_amount += item.amount;
  });

  return {
    total_rolls,
    total_weight,
    total_amount: parseFloat(total_amount.toFixed(2)),
    items // Return items with calculated amounts
  };
};

export default calculateTotals;
