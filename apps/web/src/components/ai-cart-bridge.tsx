"use client";

import { useEffect } from "react";

import { useCart } from "@/components/cart/cart-context";

interface AddToCartEventDetail {
  variantGid: string;
  quantity: number;
}

export function AiCartBridge() {
  const { addLine, openCart } = useCart();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AddToCartEventDetail>).detail;
      if (!detail?.variantGid) return;
      addLine(detail.variantGid, detail.quantity ?? 1).then(() => {
        openCart();
      });
    };
    window.addEventListener(
      "ai-commerce:add-to-cart",
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        "ai-commerce:add-to-cart",
        handler as EventListener,
      );
    };
  }, [addLine, openCart]);

  return null;
}
