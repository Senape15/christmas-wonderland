export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-green-900 to-green-800">
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl font-bold mb-6 text-yellow-400 drop-shadow-lg">
          Christmas Wonderland
        </h1>
        <p className="text-xl text-white/90 mb-8">
          An interactive Advent calendar experience in a navigable Christmas village
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-colors shadow-lg"
          >
            Start Your Adventure
          </a>
          <a
            href="/about"
            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full border border-white/30 transition-colors"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
}
