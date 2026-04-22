"use client";

import { useEffect, useRef } from "react";
import RangeSlider from "./RangeSlider";

type FiltersModalProps = {
  open: boolean;
  onClose: () => void;
  selectedPillar: string;
  setSelectedPillar: (value: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (value: string[]) => void;
  onlyFree: boolean;
  setOnlyFree: (value: boolean) => void;
  priceMin: number;
  setPriceMin: (value: number) => void;
  priceMax: number;
  setPriceMax: (value: number) => void;
  onApply: () => void;
  onReset: () => void;
  resultsCount: number;
  sportsCategories: string[];
  culturalCategories: string[];
  minEventPrice: number;
  maxEventPrice: number;
  useOutsideClick: <T extends HTMLElement>(
    ref: React.RefObject<T | null>,
    handler: () => void
  ) => void;
};

export default function FiltersModal({
  open,
  onClose,
  selectedPillar,
  setSelectedPillar,
  selectedCategories,
  setSelectedCategories,
  onlyFree,
  setOnlyFree,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  onApply,
  onReset,
  resultsCount,
  sportsCategories,
  culturalCategories,
  minEventPrice,
  maxEventPrice,
  useOutsideClick,
}: FiltersModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useOutsideClick(modalRef, () => {
    if (open) onClose();
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function toggleCategory(category: string) {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((item) => item !== category));
      return;
    }

    setSelectedCategories([...selectedCategories, category]);
  }

  const canReset =
    selectedPillar !== "" ||
    selectedCategories.length > 0 ||
    onlyFree ||
    priceMin !== minEventPrice ||
    priceMax !== maxEventPrice;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px]">
      <div className="flex h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="flex max-h-[88vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-center justify-between border-b border-[#ececec] px-6 py-5">
            <div className="w-10" />
            <h2 className="text-[18px] font-extrabold text-[#111]">Filtros</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[28px] text-[#111] transition hover:bg-[#f5f5f5]"
              aria-label="Cerrar filtros"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-6">
            <section className="border-b border-[#efefef] pb-8">
              <h3 className="mb-4 text-[20px] font-extrabold text-[#111]">
                Tipo de evento
              </h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-3 text-sm font-bold uppercase tracking-[0.04em] text-[#777]">
                    Deportivos
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPillar("Deportivos");
                        setSelectedCategories([]);
                      }}
                      className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                        selectedPillar === "Deportivos"
                          ? "border-[#111] bg-[#111] text-white"
                          : "border-[#e7e7e7] bg-white text-[#111] hover:bg-[#fafafa]"
                      }`}
                    >
                      Todos los deportivos
                    </button>

                    {sportsCategories.map((category) => {
                      const active = selectedCategories.includes(category);

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setSelectedPillar("Deportivos");
                            toggleCategory(category);
                          }}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? "border-[#111] bg-[#111] text-white"
                              : "border-[#e7e7e7] bg-white text-[#111] hover:bg-[#fafafa]"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-sm font-bold uppercase tracking-[0.04em] text-[#777]">
                    Culturales
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPillar("Culturales");
                        setSelectedCategories([]);
                      }}
                      className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                        selectedPillar === "Culturales"
                          ? "border-[#111] bg-[#111] text-white"
                          : "border-[#e7e7e7] bg-white text-[#111] hover:bg-[#fafafa]"
                      }`}
                    >
                      Todos los culturales
                    </button>

                    {culturalCategories.map((category) => {
                      const active = selectedCategories.includes(category);

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setSelectedPillar("Culturales");
                            toggleCategory(category);
                          }}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? "border-[#111] bg-[#111] text-white"
                              : "border-[#e7e7e7] bg-white text-[#111] hover:bg-[#fafafa]"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPillar("");
                    setSelectedCategories([]);
                  }}
                  className="text-sm font-semibold text-[#666] underline"
                >
                  Ver todas las categorías
                </button>
              </div>
            </section>

            <section className="border-b border-[#efefef] py-8">
              <h3 className="mb-4 text-[20px] font-extrabold text-[#111]">
                Precio
              </h3>

              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => setOnlyFree(!onlyFree)}
                  className={`rounded-full border px-4 py-3 text-sm font-bold transition ${
                    onlyFree
                      ? "border-[#111] bg-[#111] text-white"
                      : "border-[#e7e7e7] bg-white text-[#111] hover:bg-[#fafafa]"
                  }`}
                >
                  Gratis
                </button>
              </div>

              {!onlyFree && (
                <RangeSlider
                  min={minEventPrice}
                  max={maxEventPrice}
                  valueMin={priceMin}
                  valueMax={priceMax}
                  onChangeMin={setPriceMin}
                  onChangeMax={setPriceMax}
                />
              )}
            </section>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#ececec] px-6 py-5">
            <button
              type="button"
              onClick={onReset}
              disabled={!canReset}
              className={`text-[16px] font-bold underline ${
                canReset ? "text-[#111]" : "cursor-not-allowed text-[#bbb]"
              }`}
            >
              Quitar filtros
            </button>

            <button
              type="button"
              onClick={onApply}
              className="rounded-[16px] bg-[#111] px-6 py-4 text-[16px] font-extrabold text-white"
            >
              Mostrar {resultsCount} evento{resultsCount === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}