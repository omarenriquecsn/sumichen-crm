  
  
  export const typeChange = (incremento: number) => {
    if (incremento > 0) {
      return "positive";
    } else if (incremento < 0) {
      return "negative";
    } else {
      return "neutral";
    }
  };