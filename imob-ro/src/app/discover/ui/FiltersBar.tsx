"use client";

type Props = { value: any; onChange: (v: any) => void };

export function FiltersBar({ value, onChange }: Props) {
  function upd(partial: any) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="border rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="€ min"
        value={value.priceMin ?? ""}
        onChange={(e) => upd({ priceMin: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="€ max"
        value={value.priceMax ?? ""}
        onChange={(e) => upd({ priceMax: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="m² min"
        value={value.m2Min ?? ""}
        onChange={(e) => upd({ m2Min: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="m² max"
        value={value.m2Max ?? ""}
        onChange={(e) => upd({ m2Max: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="€/m² min"
        value={value.eurm2Min ?? ""}
        onChange={(e) => upd({ eurm2Min: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="€/m² max"
        value={value.eurm2Max ?? ""}
        onChange={(e) => upd({ eurm2Max: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Camere min"
        value={value.roomsMin ?? ""}
        onChange={(e) => upd({ roomsMin: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Camere max"
        value={value.roomsMax ?? ""}
        onChange={(e) => upd({ roomsMax: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="An min"
        value={value.yearMin ?? ""}
        onChange={(e) => upd({ yearMin: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="An max"
        value={value.yearMax ?? ""}
        onChange={(e) => upd({ yearMax: e.target.value })}
      />
      <input
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Metrou max (m)"
        value={value.metroMaxM ?? ""}
        onChange={(e) => upd({ metroMaxM: e.target.value })}
      />
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!value.underpriced}
          onChange={(e) => upd({ underpriced: e.target.checked })}
        />
        <span>Sub prețul pieței</span>
      </label>
    </div>
  );
}
