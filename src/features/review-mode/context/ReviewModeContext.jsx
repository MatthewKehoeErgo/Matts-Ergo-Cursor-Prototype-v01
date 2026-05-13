import { createContext, useContext } from "react";

const ReviewModeContext = createContext(null);

export function ReviewModeContextProvider({ value, children }) {
  return (
    <ReviewModeContext.Provider value={value}>
      {children}
    </ReviewModeContext.Provider>
  );
}

export function useReviewMode() {
  const ctx = useContext(ReviewModeContext);
  if (!ctx) {
    throw new Error("useReviewMode must be used within a ReviewModeProvider.");
  }
  return ctx;
}
