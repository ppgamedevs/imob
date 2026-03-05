export default function AnalyzeLoading() {
  return (
    <div className="mx-auto max-w-[520px] px-5 py-24 md:py-36">
      <div className="text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
        </div>
        <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight text-gray-950">
          Se pregateste analiza...
        </h2>
        <p className="mt-2 text-[14px] text-gray-500">
          O secunda, pregatim totul.
        </p>
      </div>
    </div>
  );
}
