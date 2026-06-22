export default function TestOverflowPage() {
  return (
    <div className="min-h-screen p-4 bg-gray-900 w-full">
      <div className="w-full max-w-7xl mx-auto">
        <form className="flex flex-col gap-1 w-full md:w-auto">
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={40}
              placeholder="YouTube Channel ID..."
              className="min-w-0 flex-1 glass-input rounded-button px-4 py-2 text-base md:text-xs placeholder-text-muted transition-all duration-200"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs shrink-0 w-[80px]"
            >
              Analyze
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
