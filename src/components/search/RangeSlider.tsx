"use client";

type RangeSliderProps = {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function RangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
}: RangeSliderProps) {
  const safeRange = Math.max(max - min, 1);
  const progressLeft = ((valueMin - min) / safeRange) * 100;
  const progressRight = ((valueMax - min) / safeRange) * 100;

  return (
    <div>
      <div className="relative mb-6 h-8">
        <div className="absolute left-0 right-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-[#e5e5e5]" />

        <div
          className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-[#111]"
          style={{
            left: `${progressLeft}%`,
            width: `${progressRight - progressLeft}%`,
          }}
        />

        <input
          type="range"
          min={min}
          max={max}
          value={valueMin}
          onChange={(e) =>
            onChangeMin(clamp(Number(e.target.value), min, valueMax))
          }
          className="pointer-events-none absolute left-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:h-7
            [&::-webkit-slider-thumb]:w-7
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:border
            [&::-webkit-slider-thumb]:border-[#d9d9d9]
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:h-7
            [&::-moz-range-thumb]:w-7
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border
            [&::-moz-range-thumb]:border-[#d9d9d9]
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:shadow-md"
        />

        <input
          type="range"
          min={min}
          max={max}
          value={valueMax}
          onChange={(e) =>
            onChangeMax(clamp(Number(e.target.value), valueMin, max))
          }
          className="pointer-events-none absolute left-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:h-7
            [&::-webkit-slider-thumb]:w-7
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:border
            [&::-webkit-slider-thumb]:border-[#d9d9d9]
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:h-7
            [&::-moz-range-thumb]:w-7
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border
            [&::-moz-range-thumb]:border-[#d9d9d9]
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:shadow-md"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[18px] border border-[#e7e7e7] px-4 py-4">
          <div className="mb-1 text-sm font-bold text-[#666]">Mínimo</div>
          <div className="text-[20px] font-extrabold text-[#111]">
            {valueMin}€
          </div>
        </div>

        <div className="rounded-[18px] border border-[#e7e7e7] px-4 py-4">
          <div className="mb-1 text-sm font-bold text-[#666]">Máximo</div>
          <div className="text-[20px] font-extrabold text-[#111]">
            {valueMax}€
          </div>
        </div>
      </div>
    </div>
  );
}